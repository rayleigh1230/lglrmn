/**
 * 蓝图计算层：从配置表 + 强化状态 → 蓝图面板数值
 *
 * 职责：
 *   1. resolveShipWeapons()  武器装配（cfg_ship_slot → 武器列表，含 dph/cd/分类）
 *   2. computeFirepower()    火力计算（对舰/防空/攻城，按面板口径）
 *   3. resolveShipDefense()  防御属性（抵抗/护盾/曲率）
 *   4. resolveBlueprintPanel() 总入口 → BlueprintPanel
 *
 * 引擎战斗数据与 UI 都走这层，方便后续保存多套配置。
 */
import type { ClientDataStore, ResolvedBlueprint } from "./index.js";

// ===== 武器分类 =====
export type WeaponCategory = "antiShip" | "antiAir" | "siege";

// 装配出的单门武器（面板计算用）
export interface AssembledWeapon {
  weaponId: string;
  systemId: string;       // 所属子系统(7位)
  systemLabel: string;    // 系统标签(火炮/导弹/载机/无人机等)
  dph: number;            // 单发基础伤害（cfg_weapon_action[2]，未含强化）
  attackRounds: number;   // 每轮攻击次数（cfg_weapon_action[0]，如FG300=3）
  attackCount: number;    // 攻击次数倍数（cfg_weapon_action[3]，通常1或2）
  installNum: number;     // 安装数量（cfg_ship_slot[1]，如FG300主炮3门）
  antiaircraftRatio: number; // 防空比例（cfg_ship_slot[4]，如200）
  shotsPerCycle: number;  // 兼容字段：= attackCount
  fireDuration: number;   // 持续开火时长秒（cfg_weapon_action[4]/1000）
  cooldown: number;       // 冷却秒（cfg_weapon.CD_TIME/1000）
  weaponType: number;     // WEAPON_TYPE（2导弹/3火炮/4轨道炮/5能量/6投射/7离子/8特殊）
  specialTargetLogic: number; // SPECIAL_TARGET_LOGIC（2对舰/8防空/10反导）
  destroyCoef: number;    // 攻城系数（cfg_weapon.DESTROY_COEF，如14）
  aircraftCoef: number;   // 对空系数（cfg_weapon.AIRCRAFT_COEF，如100）
  airBaseBonus: number;   // 对空基础单发增加（module_effect EID=12300，防空专用固定增伤）
  airCdReduction: number; // 对空冷却时间下降（module_effect EID=12306，万分比/100，如40=降40%）
  airDurReduction: number;// 对空攻击持续时间下降（module_effect EID=12311，万分比/100）
  isAirborne: boolean;    // 是否机载（战机/艇自身 或 无人机/载机系统的武器）
  canTargetShip: boolean;     // ★是否对舰(weapon_priority_target_ship)
  canTargetAircraft: boolean; // ★是否防空(weapon_priority_target_aircraft)
  canTargetDestroy: boolean;  // ★是否攻城(weapon_priority_target_destroy)
  category: WeaponCategory; // 火力归类(对舰/防空/攻城)
}

// ===== 蓝图面板 =====
export interface BlueprintPanel {
  shipId: string;
  // 基础属性（分层：Layer0 出厂 + Layer1 模块 = skeleton）
  structure: number;       // ★骨架结构值 = baseStructure + moduleStructureBonus（面板显示口径）
  baseStructure: number;   // Layer0 出厂结构值（cfg_ship[4]，不含模块）
  moduleStructureBonus: number;  // Layer1 模块结构加成绝对值（floor(base × ΣEID=10 PARAM/10000)）
  finalStructure: number;  // Layer2 含强化/巅峰/技术值的最终结构（强化系数作用于 skeleton）
  resistance: number;      // 抵抗值（基础+加成）
  shield: number;          // 护盾百分比（如 15 = 15%，直接是 module_effect EID=10021 的 PARAM）
  speed: number;           // 普通移速（含加成）
  curvatureSpeed: number;  // ★曲率速度（基础值 ship[8] × (1+加成)，含巅峰曲率加成）
  curvatureSpeedBonus: number; // 曲率速度加成（万分比，强化+巅峰，用于显示+X%）
  // 巅峰等级（0=无巅峰）
  peakLevel: number;       // 巅峰等级（1-20）
  // 维修
  repairEfficiency: number; // 维修效率提升（万分比，0=无维修加成，来自强化EID=12050系统自维修）
  repairGain: number;       // ★受维修量提升（百分比，如3.6=3.6%，= 装甲抵抗值×0.1，含模块+强化）
  // 火力
  firepower: {
    antiShip: number;
    antiAir: number;
    siege: number;
  };
  // 武器明细（调试/后续用）
  weapons: AssembledWeapon[];
}

// ===== 1. 武器装配 =====

const PERCENTile = 10000;

/**
 * 武器优先级表（从 weapon_priority.json 加载）
 * 决定武器是否贡献对舰/防空/攻城火力。来自游戏 client_configdata。
 */
let _priorityShip = new Set<number>();
let _priorityAir = new Set<number>();
let _priorityDestroy = new Set<number>();

/** 加载武器优先级表（前端启动时调用一次） */
export function loadWeaponPriority(data: { target_ship?: number[]; target_aircraft?: number[]; target_destroy?: number[] }) {
  _priorityShip = new Set(data.target_ship ?? []);
  _priorityAir = new Set(data.target_aircraft ?? []);
  _priorityDestroy = new Set(data.target_destroy ?? []);
}

/**
 * 解析舰船当前实际启用的系统ID集合（切换组互斥语义）。
 *
 * 模块选择规则（与 editor 侧 blueprintSelector 一致）：
 *   - 同 GROUP ≥2 成员 = 切换组：组内所有成员（含初始默认项）等价可选，同时只启用一个。
 *     用户在 enabledSlots 指定了组内某成员 → 启用该成员；
 *     否则启用默认项（组内第一个 ADDITIONAL_SYS≠1 的）；全可选组无默认则初始不启用。
 *   - 单成员组 = 固定系统：恒启用。
 *
 * 这样保证切换组里"固定项"被换成可选项时，固定项会被卸载（不再双重装配）。
 *
 * @returns 启用的 systemId 集合；undefined 表示无 shipSystem 表（调用方按原逻辑处理）
 */
function resolveEnabledSystems(
  systems: Record<string, Record<string, unknown>>,
  shipId: string,
  enabledSlots?: string[]
): Set<string> | null {
  const enabledSet = enabledSlots ? new Set(enabledSlots) : null;

  // 按 GROUP 分组（无 GROUP 的系统各自成单成员组）
  const byGroup: Record<string, string[]> = {};
  for (const k in systems) {
    if (!k.startsWith(shipId)) continue;
    const g = systems[k].GROUP;
    const gKey = g != null ? String(g) : k;
    (byGroup[gKey] = byGroup[gKey] || []).push(k);
  }

  const result = new Set<string>();
  for (const gKey in byGroup) {
    const members = byGroup[gKey].sort((a, b) => a.localeCompare(b));
    if (members.length < 2) {
      // 单成员组: 固定系统恒启用
      result.add(members[0]);
      continue;
    }
    // 切换组: 用户显式选中优先
    const userSel = enabledSet ? members.find((m) => enabledSet.has(m)) : null;
    if (userSel) {
      result.add(userSel);
    } else {
      // 默认项: 组内第一个 ADDITIONAL_SYS≠1 的；全可选组无默认则不启用
      const def = members.find((m) => Number(systems[m].ADDITIONAL_SYS ?? 0) !== 1);
      if (def) result.add(def);
    }
  }
  return result;
}

/**
 * 从 cfg_ship_slot 装配舰船的所有武器
 * @param store 配置数据
 * @param shipId 5位舰船ID
 * @param enabledSlots 启用的系统ID列表（可选，超主力舰模块选择用）。提供后只装配启用系统的武器。
 */
export function resolveShipWeapons(store: ClientDataStore, shipId: string, enabledSlots?: string[]): AssembledWeapon[] {
  const slots = store.shipSlot as Record<string, unknown[]> | undefined;
  const weapons = store.weapon as Record<string, Record<string, unknown>> | undefined;
  const actions = store.weaponAction as Record<string, number[]> | undefined;
  const systems = store.shipSystem as Record<string, Record<string, unknown>> | undefined;
  if (!slots || !weapons || !actions) return [];

  // 启用系统集合（切换组互斥：固定项被换掉时不装配）
  const enabledSysSet = systems ? resolveEnabledSystems(systems, shipId, enabledSlots) : null;

  const result: AssembledWeapon[] = [];
  const seen = new Set<string>(); // 同 weaponId 去重(一个武器可能挂在多个槽)

  for (const slotId in slots) {
    if (!slotId.startsWith(shipId)) continue;
    const row = slots[slotId];
    const cat = Number(row[0]); // 0=模块, 1=主武, 2=副武
    if (cat !== 1 && cat !== 2) continue; // 只取武器槽

    // 系统启用过滤：仅装配 resolveEnabledSystems 判定为启用的系统
    const modSystemId = slotId.slice(0, 7);
    if (enabledSysSet && !enabledSysSet.has(modSystemId)) continue;

    const weaponId = String(row[2]);
    if (!weaponId || weaponId === "0") continue;

    // 去重：同武器只算一次（数量在面板火力里不体现倍数，按武器本身算）
    const dedupKey = weaponId;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    const w = weapons[weaponId];
    if (!w) continue;
    const actionKey = weaponId + "01";
    const action = actions[actionKey];
    if (!action || action.length < 3) continue;

    const dph = Number(action[2]) || 0;
    const attackRounds = Number(action[0]) || 1;   // action[0]: 每轮攻击次数
    const attackCount = Number(action[3]) || 1;     // action[3]: 攻击次数倍数
    const fireDurationMs = Number(action[4]) || 0;
    const installNum = Number(row[1]) || 1;         // slot[1]: 安装数量
    const antiaircraftRatio = Number(row[4]) || 0;  // slot[4]: 防空比例
    const cdTime = Number(w.CD_TIME) || Number(w.ATTACK_INTERVAL) || 3000; // CD缺失时默认3000ms(防空武器等)
    const weaponType = Number(w.WEAPON_TYPE) || 0;
    const specialTargetLogic = Number(w.SPECIAL_TARGET_LOGIC) || 0;
    const destroyCoef = Number(w.DESTROY_COEF) || 0;
    const aircraftCoef = Number(w.AIRCRAFT_COEF) || 0;

    // 对空基础单发增加（module_effect EID=12300，防空专用固定增伤词条）
    // 对空冷却时间下降（EID=12306，防空高速高效循环）
    // 对空攻击持续时间下降（EID=12311，防空高效打击）
    // key = weaponId + 序号(01/02/03...)，遍历该武器的所有 module_effect
    let airBaseBonus = 0;
    let airCdReduction = 0;
    let airDurReduction = 0;
    const moduleEffect = store.moduleEffect as Record<string, Record<string, unknown>> | undefined;
    if (moduleEffect) {
      for (const meKey in moduleEffect) {
        if (!meKey.startsWith(weaponId)) continue;
        const me = moduleEffect[meKey];
        const eid = Number(me.EFFECT_ID);
        const param = Number(me.EFFECT_PARAM) || 0;
        if (eid === 12300) airBaseBonus = param;        // 对空基础单发增加
        else if (eid === 12306) airCdReduction = param; // 对空冷却时间下降(%)
        else if (eid === 12311) airDurReduction = param;// 对空攻击持续时间下降(%)
      }
    }

    // 找所属子系统: slotId 前7位 = systemId
    const systemId = slotId.slice(0, 7);
    const sys = systems?.[systemId];
    const systemLabel = String(sys?.SYSTEM_LABEL ?? "");
    const isAirborne = /载机|无人机/.test(systemLabel) || shipId.startsWith("1") || shipId.startsWith("2");

    // 火力归类: 默认对舰, 明确防空(STL=8/10)或攻城(WT=8)才特殊归类
    let category: WeaponCategory = "antiShip";
    if (specialTargetLogic === 8 || specialTargetLogic === 10) {
      category = "antiAir";
    } else if (weaponType === 8) {
      category = "siege";
    }

    result.push({
      weaponId,
      systemId,
      systemLabel,
      dph,
      attackRounds,
      attackCount,
      installNum,
      antiaircraftRatio,
      shotsPerCycle: attackCount,
      fireDuration: fireDurationMs / 1000,
      cooldown: cdTime / 1000,
      weaponType,
      specialTargetLogic,
      destroyCoef,
      aircraftCoef,
      airBaseBonus,
      airCdReduction,
      airDurReduction,
      isAirborne,
      canTargetShip: _priorityShip.has(Number(weaponId)),
      canTargetAircraft: _priorityAir.has(Number(weaponId)),
      canTargetDestroy: _priorityDestroy.has(Number(weaponId)),
      category,
    });
  }
  return result;
}

// ===== 2. 火力计算 =====

/** 默认物理抵抗值（面板口径，用于计算穿透后的单发伤害） */
const DEFAULT_ARMOR = 10;

/**
 * 计算面板火力（对舰/防空/攻城）—— 单位：每分钟伤害（DPM）
 *
 * ★ 精确公式（2026-07-03 从游戏 data.ship_attr_calc 表达式树 AST 还原，4武器全匹配）：
 *
 * 周期秒 period = fireDuration + cooldown
 *
 * 【对舰火力】每门武器贡献 =
 *   attackRounds(act0) × 单发穿抗伤害 × attackCount(act3) × 60 × installNum / period
 *   单发穿抗伤害 = max(dph - DEFAULT_ARMOR, dph × 0.1)
 *
 * 【攻城火力】每门武器贡献 =
 *   attackRounds × 单发攻城伤害 × attackCount × 60 × installNum / period
 *   单发攻城伤害 = dph × DESTROY_COEF / 100
 *   （DESTROY_COEF=0 的武器无攻城火力）
 *
 * 【防空火力】每门武器贡献 =
 *   单发防空伤害 × attackRounds × attackCount × 60 × installNum / period
 *   / 100 × antiaircraftRatio(slot[4]) × fixedHitRate(0.15)
 *   （antiaircraftRatio=0 的武器无防空火力）
 *
 * 锚点验证（FG300 主炮13011）：
 *   action=(3,2,30,1,3000), slot=(1,3,...,200,...), DC=14, cd=4
 *   period=3+4=7, 单发穿抗=max(30-10,3)=20
 *   对舰 = 3×20×1×60×3/7 = 1542.86 ✓ (面板1542)
 *   攻城 = 3×(30×14/100)×1×60×3/7 = 324 ✓
 *   防空 = 单发防空×3×1×60×3/7/100×200×0.15 = 1851.43 ✓
 */
export function computeFirepower(
  weapons: AssembledWeapon[],
  blueprint?: ResolvedBlueprint | null
): { antiShip: number; antiAir: number; siege: number } {
  let antiShip = 0;
  let antiAir = 0;
  let siege = 0;

  for (const w of weapons) {
    if (w.dph <= 0) continue;
    const period = w.fireDuration + w.cooldown;
    if (period <= 0) continue;

    // 强化加成系数（万分比 → 倍率）
    const dmgBonusKey = w.systemLabel || "";
    const weaponDmgBonus = (blueprint?.weaponDamageBonus?.[dmgBonusKey] ?? 0) / PERCENTile;
    const baseDmgBonus = blueprint?.baseDamageBonus ?? 0; // 绝对值 +dph
    const effectiveDph = (w.dph + baseDmgBonus) * (1 + weaponDmgBonus);

    // 通用因子: attackRounds × attackCount × 60 × installNum / period
    const cycleFactor = (w.attackRounds * w.attackCount * 60 * w.installNum) / period;

    // === 对舰火力（按 weapon_priority_target_ship 判定）===
    if (w.canTargetShip) {
      const perHitShip = Math.max(effectiveDph - DEFAULT_ARMOR, effectiveDph * 0.1);
      antiShip += perHitShip * cycleFactor;
    }

    // === 攻城火力（按 weapon_priority_target_destroy + DESTROY_COEF > 0）===
    if (w.canTargetDestroy && w.destroyCoef > 0) {
      const siegeBonus = 1 + (blueprint?.siegeDamageBonus ?? 0) / PERCENTile;
      const perHitSiege = (effectiveDph * w.destroyCoef) / 100;
      siege += perHitSiege * cycleFactor * siegeBonus;
    }

    // === 防空火力（按 weapon_priority_target_aircraft + antiaircraftRatio > 0）===
    if (w.canTargetAircraft && w.antiaircraftRatio > 0) {
      const aaBonus = 1 + (blueprint?.antiAirDamageBonus ?? 0) / PERCENTile;
      const fixedHitRate = 0.15; // 防空固定命中率
      // ★防空单发 = base(dph) + 对空基础单发增加(airBaseBonus, module_effect EID=12300)
      // 与对舰不同：防空不穿抗（不减抵抗值），直接用 base + 固定增伤词条
      // 实测：FG300 base=30 + airBaseBonus=50 = 80 ✓
      //       澄海13124 base=20 + airBaseBonus=60 = 80 ✓
      const perHitAir = effectiveDph + w.airBaseBonus;
      // ★防空专用 period：受"防空高速高效循环(EID=12306降CD)"和"防空高效打击(EID=12311降duration)"缩放
      // 防空duration' = duration × (1 - airDurReduction/100)
      // 防空cd' = cooldown × (1 - airCdReduction/100)
      // 防空period = 防空duration' + 防空cd'
      // 实测：澄海13124 dur=4×(1-0.4)=2.4, cd=6×(1-0.4)=3.6, period=6.0 ✓
      //       澄海13122 dur=3×(1-0.1)=2.7, cd=3×(1-0.1)=2.7, period=5.4 ✓
      const airPeriod = w.fireDuration * (1 - w.airDurReduction / 100) +
                        w.cooldown * (1 - w.airCdReduction / 100);
      if (airPeriod > 0) {
        const airCycleFactor = (w.attackRounds * w.attackCount * 60 * w.installNum) / airPeriod;
        antiAir += (perHitAir * airCycleFactor / 100) * w.antiaircraftRatio * fixedHitRate * aaBonus;
      }
    }
  }

  return {
    antiShip: Math.round(antiShip),
    antiAir: Math.round(antiAir),
    siege: Math.round(siege),
  };
}

// ===== 3. 防御属性 =====

/** EFFECT_ID 常量（模块基础属性，全部来自 cfg_module_effect） */
const EFFECT_RESIST = 10033;      // 物理抵抗值（绝对值，直接加）
const EFFECT_SHIELD = 10021;      // 能量护盾（百分比，直接加）
const EFFECT_STRUCTURE_HP = 10;   // 舰船结构值提高（万分比，base × PARAM/10000）

/**
 * ★受维修量提升系数（REPAIR_ADJUST_COEF），按舰种不同。
 * 来自客户端 dump 的 cfg_ship_type.repair_adjust_coef（加密模块，JSON 无此字段，硬编码）。
 * 战机/护航艇无受维修加成（系数=0）。
 * 实测：护卫0.05 / 驱逐0.1 / 巡洋0.2 / 超主力(战巡/航母/支援)0.25 / 战列待定(暂0.25)。
 * 舰种由 cfg_ship[11]（SHIP_TYPE）确定，对照白名单169艘全验证。
 */
const REPAIR_ADJUST_COEF: Record<number, number> = {
  3: 0.05,  // 护卫舰
  4: 0.1,   // 驱逐舰
  5: 0.2,   // 巡洋舰
  6: 0.25,  // 战列巡洋舰（超主力）
  7: 0.25,  // 支援舰（超主力）
  8: 0.25,  // 航空母舰（超主力）
  9: 0.25,  // 战列舰（超主力，待实测确认）
  // 1 战机 / 2 护航艇：无（0）
};

/**
 * 从 cfg_ship_slot 找装甲系统的模块ID（cat=0 的槽，SYSTEM_LABEL='装甲'）
 * 装甲系统的 slotId 前7位 = shipId(5) + slot(2)
 * 在 cfg_ship_slot 里找以该 systemId 开头且 cat=0 的记录，取 weaponId（即 moduleId）
 */
function getArmorModuleIds(
  store: ClientDataStore,
  shipId: string,
  enabledSlots?: string[]
): string[] {
  const slots = store.shipSlot as Record<string, unknown[]> | undefined;
  const systems = store.shipSystem as Record<string, Record<string, unknown>> | undefined;
  if (!slots || !systems) return [];

  // 启用系统集合（切换组互斥：固定项被换掉时不装配）
  const enabledSysSet = resolveEnabledSystems(systems, shipId, enabledSlots);

  // 找装甲系统的 systemId（SYSTEM_LABEL='装甲' 或 SYSTEM_TYPE=4）
  const armorSystemIds: string[] = [];
  for (const k in systems) {
    if (!k.startsWith(shipId)) continue;
    const s = systems[k];
    if (s.SYSTEM_LABEL === "装甲" || s.SYSTEM_TYPE === 4) {
      armorSystemIds.push(k); // 7位 systemId
    }
  }

  // 从 cfg_ship_slot 找装甲系统下的模块（cat=0），只取启用系统的模块
  const moduleIds: string[] = [];
  for (const slotId in slots) {
    const row = slots[slotId];
    if (Number(row[0]) !== 0) continue; // 只取 cat=0（模块）
    const weaponId = String(row[2]);
    if (!weaponId || weaponId === "0") continue;
    const sysId = slotId.slice(0, 7);
    if (!armorSystemIds.includes(sysId)) continue;
    // 系统启用过滤
    if (enabledSysSet && !enabledSysSet.has(sysId)) continue;
    moduleIds.push(weaponId);
  }
  return moduleIds;
}

/**
 * 从 module_effect 取装甲模块提供的面板基础属性（Layer1：抵抗/护盾/结构）。
 *
 * 三大基础属性完全平行，都来自 cfg_module_effect，按 enabledSlots 过滤的装甲模块聚合：
 *   - EFFECT_ID=10033 抵抗值（绝对值，直接加）
 *   - EFFECT_ID=10021 护盾（百分比，直接加）
 *   - EFFECT_ID=10    结构值提高（★万分比，moduleStructureBonus = baseStructure × ΣPARAM/10000）
 *
 * 注意：EID=10 在两套表里语义不同——
 *   cfg_module_effect 的 EID=10 是模块结构加成（万分比，本函数处理）；
 *   cfg_system_effect  的 EID=10 是强化项"龙骨结构增强"（PARAM_LEVEL 等级表，走 resolver）。
 * 两表的 EID 命名空间相互独立。
 *
 * module_effect key = moduleId(5位) + 序号(2位)
 *
 * @returns resistance 绝对值, shield 百分比, structurePermille 结构加成万分比总和
 */
export function getBaseDefense(
  store: ClientDataStore,
  shipId: string,
  enabledSlots?: string[]
): { resistance: number; shield: number; structurePermille: number } {
  const moduleEffect = store.moduleEffect as Record<string, Record<string, unknown>> | undefined;
  if (!moduleEffect) return { resistance: 0, shield: 0, structurePermille: 0 };

  const armorModuleIds = getArmorModuleIds(store, shipId, enabledSlots);
  let resistance = 0;
  let shield = 0;
  let structurePermille = 0;

  for (const moduleId of armorModuleIds) {
    // 遍历该模块的所有效果（key = moduleId + 序号）
    for (const key in moduleEffect) {
      if (!key.startsWith(moduleId)) continue;
      const eff = moduleEffect[key];
      const effectId = Number(eff.EFFECT_ID);
      const param = Number(eff.EFFECT_PARAM) || 0;
      if (effectId === EFFECT_RESIST) {
        resistance += param; // 绝对值
      } else if (effectId === EFFECT_SHIELD) {
        shield += param; // 百分比
      } else if (effectId === EFFECT_STRUCTURE_HP) {
        structurePermille += param; // 万分比（base × Σ/10000 在调用方算）
      }
    }
  }

  return { resistance, shield, structurePermille };
}

// ===== 4. 总入口 =====

/**
 * 计算蓝图完整面板数据
 * @param store 配置数据
 * @param shipId 5位舰船ID
 * @param shipName 舰名（用于推断ship_type取抵抗）
 * @param blueprint resolveBlueprint的结果（含强化加成，可选）
 */
export function resolveBlueprintPanel(
  store: ClientDataStore,
  shipId: string,
  shipName: string,
  blueprint?: ResolvedBlueprint | null,
  enabledSlots?: string[]
): BlueprintPanel {
  void shipName; // 兼容旧调用（舰种改用 cfg_ship[11] 字段判定）
  const shipRow = store.ship?.[shipId] as unknown[] | undefined;
  const baseStructure = shipRow ? Number(shipRow[4]) : 0; // Layer0 出厂结构（cfg_ship[4]，不动）
  const baseSpeed = shipRow ? Number(shipRow[5]) : 0;

  // Layer1 模块基础属性: 抵抗/护盾/结构加成（从装甲模块的 module_effect 取，按 enabledSlots 过滤）
  const defense = getBaseDefense(store, shipId, enabledSlots);
  const resistance = defense.resistance + (blueprint?.resistanceBonus ?? 0);
  const shield = defense.shield; // module_effect EID=10021 PARAM 直接是百分比(15=15%)

  // ★模块结构加成（Layer1）: EID=10 万分比 × 出厂基础值
  // 只有特殊装甲模块（附加装甲/纳米修复类）带 EID=10，大多数装甲模块无结构加成
  const moduleStructureBonus = Math.floor((baseStructure * defense.structurePermille) / PERCENTile);
  // 骨架结构 = Layer0 + Layer1（强化系数作用于这个完整骨架）
  const skeletonStructure = baseStructure + moduleStructureBonus;

  // 速度: 基础值 × (1 + 强化加成 + 巅峰常规移速加成)
  const speed = Math.round(baseSpeed * (1 + (blueprint?.speedBonus ?? 0) / PERCENTile));

  // ★曲率速度: 基础值 ship[8] × (1 + 强化曲率加成 + 巅峰曲率加成)
  // 曲率基础值来自 cfg_ship[8]（FG300=1500, ST59=2500）
  const baseCurvature = shipRow ? Number(shipRow[8]) : 0;
  const curvatureBonusTotal = (blueprint?.curvatureSpeedBonus ?? 0) + (blueprint?.peakCurvatureSpeedBonus ?? 0);
  const curvatureSpeed = Math.round(baseCurvature * (1 + curvatureBonusTotal / PERCENTile));

  // 武器装配+火力（按 enabledSlots 过滤可选模块）
  const weapons = resolveShipWeapons(store, shipId, enabledSlots);
  const firepower = computeFirepower(weapons, blueprint);

  // ★受维修量提升（百分比）= 装甲抵抗值 × 舰种系数(REPAIR_ADJUST_COEF)
  // 装甲抵抗 = 模块EID=10033 + 强化EID=10033（不含ship_type基础抵抗）
  // 系数按舰种不同（cfg_ship[11]）：护卫0.05/驱逐0.1/巡洋0.2/超主力0.25，战机/护航艇无(0)
  // 实测锚点：斗牛(驱逐0.1) 模块20×0.1=2% + 强化16×0.1=1.6% = 3.6%
  const shipType = Number(shipRow?.[11] ?? 0);
  const repairCoef = REPAIR_ADJUST_COEF[shipType] ?? 0;
  const repairGain = Math.round(resistance * repairCoef * 100) / 100; // 保留2位小数

  return {
    shipId,
    structure: skeletonStructure,          // 面板显示的骨架结构（Layer0+1）
    baseStructure,                          // Layer0 出厂结构（cfg_ship[4]）
    moduleStructureBonus,                   // Layer1 模块结构加成绝对值
    finalStructure: blueprint?.finalStructure ?? skeletonStructure, // Layer2 含强化/巅峰/技术值
    resistance,
    shield,
    speed,
    curvatureSpeed,
    curvatureSpeedBonus: curvatureBonusTotal,
    peakLevel: blueprint?.peakLevel ?? 0,
    repairEfficiency: blueprint?.repairEfficiencyBonus ?? 0,
    repairGain,
    firepower,
    weapons,
  };
}
