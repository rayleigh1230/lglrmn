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
  damageType: string;     // ★伤害类型('kinetic'实弹/'energy'能量, 来自weapon_action[3])
  canTargetShip: boolean;     // ★是否对舰(weapon_priority_target_ship)
  canTargetAircraft: boolean; // ★是否防空(weapon_priority_target_aircraft)
  canTargetDestroy: boolean;  // ★是否攻城(weapon_priority_target_destroy)
  slotId: string;         // ★完整9位槽位（scope判定用）
  shipType: number;       // ★所属舰船 ship_type（cfg_ship[11]，防空固定命中率判定用）
  tmt: number;            // ★武器 TARGET_MODULE_TYPE（scope判定用，由 WEAPON_TYPE 推导）
  actionType: number;     // ★cfg_weapon_action[1] = ACTION（1=能量 / 2=实弹 / 7=OPERATION探测）
  moduleType: number;     // ★cfg_module[0] = MODULE_TYPE（TMT 6位编码中位判定用）
  flightBefore: number;   // ★飞行前摇秒（cfg_weapon.FLIGHT_TIME_BEFORE_CD /1000，投射武器有值）
  flightAfter: number;    // ★飞行后摇秒（cfg_weapon.FLIGHT_TIME_AFTER_CD /1000，投射武器有值）
  category: WeaponCategory; // 火力归类(对舰/防空/攻城)
  // ★V_SKILL_EFFECT_RATIO 通道（模块自带 cfg_module_effect 原值，对齐 get_module_effect_ori_value_info）
  modDamageInc: number;   // EFFECT_DAMAGE_INC(12020) 原值（所有 dpsType 基底）
  modAircraftInc: number; // EFFECT_AIRCRAFT_INC(12062) 原值（对空追加）
  modDestroyInc: number;  // EFFECT_DESTROY_INC(12060) 原值（攻城追加）
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

  // ★所属舰船 ship_type（cfg_ship[11]，防空固定命中率判定用）
  const shipRow = store.ship?.[shipId] as unknown[] | undefined;
  const shipType = shipRow ? Number(shipRow[11] ?? 0) : 0;

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
    const flightBeforeMs = Number(w.FLIGHT_TIME_BEFORE_CD) || 0;
    const flightAfterMs = Number(w.FLIGHT_TIME_AFTER_CD) || 0;
    const actionType = Number(action[1]) || 0; // action[1] = ACTION
    // MODULE_TYPE（cfg_module[0]，TMT 6位编码中位判定用）
    const moduleTypeVal = (store as any).cfgModule?.[weaponId]?.[0] ?? 0;
    const weaponType = Number(w.WEAPON_TYPE) || 0;
    const tmt = WEAPON_TYPE_TO_TMT[weaponType] ?? 0;
    const specialTargetLogic = Number(w.SPECIAL_TARGET_LOGIC) || 0;
    const destroyCoef = Number(w.DESTROY_COEF) || 0;
    const aircraftCoef = Number(w.AIRCRAFT_COEF) || 0;

    // 对空基础单发增加（module_effect EID=12300，防空专用固定增伤词条）
    // 对空冷却时间下降（EID=12306，防空高速高效循环）
    // 对空攻击持续时间下降（EID=12311，防空高效打击）
    // ★V_SKILL_EFFECT_RATIO 通道（对齐 get_weapon_attack_calc 的 get_module_effect_ori_value_info）：
    //   EFFECT_DAMAGE_INC(12020, 所有 dpsType) + EFFECT_AIRCRAFT_INC(12062, 对空) + EFFECT_DESTROY_INC(12060, 攻城)
    //   这些是武器**模块自带**的 cfg_module_effect 原值（不缩放），绑到 V_SKILL_EFFECT_RATIO。
    //   普通武器无此3类模块效果 → 0（锚点武器不受影响）。
    // key = weaponId + 序号(01/02/03...)，遍历该武器的所有 module_effect
    let airBaseBonus = 0;
    let airCdReduction = 0;
    let airDurReduction = 0;
    let modDamageInc = 0;   // EFFECT_DAMAGE_INC(12020) 模块原值（所有 dpsType 的 V_SKILL_EFFECT_RATIO 基底）
    let modAircraftInc = 0; // EFFECT_AIRCRAFT_INC(12062) 模块原值（对空 V_SKILL_EFFECT_RATIO 追加）
    let modDestroyInc = 0;  // EFFECT_DESTROY_INC(12060) 模块原值（攻城 V_SKILL_EFFECT_RATIO 追加）
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
        else if (eid === 12020) modDamageInc = param;   // ★EFFECT_DAMAGE_INC（伤害提升，模块自带）
        else if (eid === 12062) modAircraftInc = param; // ★EFFECT_AIRCRAFT_INC（对空伤害提高，模块自带）
        else if (eid === 12060) modDestroyInc = param;  // ★EFFECT_DESTROY_INC（攻城伤害提高，模块自带）
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
      slotId,
      shipType,
      tmt,
      fireDuration: fireDurationMs / 1000,
      cooldown: cdTime / 1000,
      flightBefore: flightBeforeMs / 1000,
      flightAfter: flightAfterMs / 1000,
      weaponType,
      actionType,
      moduleType: moduleTypeVal,
      specialTargetLogic,
      destroyCoef,
      aircraftCoef,
      airBaseBonus,
      airCdReduction,
      airDurReduction,
      isAirborne,
      damageType: (store as any).weaponDamageType?.[weaponId] ?? 'kinetic',
      canTargetShip: _priorityShip.has(Number(weaponId)),
      canTargetAircraft: _priorityAir.has(Number(weaponId)),
      canTargetDestroy: _priorityDestroy.has(Number(weaponId)),
      category,
      modDamageInc,
      modAircraftInc,
      modDestroyInc,
    });
  }
  return result;
}


import { computeFirepower } from './effectList.js';
// Re-export for backward compatibility (index.ts)
export { computeFirepower } from './effectList.js';


// ===== 3. 防御属性 =====

/** EFFECT_ID 常量（模块基础属性，全部来自 cfg_module_effect） */
const EFFECT_RESIST = 10033;      // 物理抵抗值（绝对值，直接加）
const EFFECT_SHIELD = 10021;      // 能量护盾（百分比，直接加）
const EFFECT_STRUCTURE_HP = 10;   // 舰船结构值提高（万分比，base × PARAM/10000）
// 非装甲系统模块也带的面板属性 EID（之前 getBaseDefense 只查装甲系统漏掉了这些）
const EFFECT_WEAPON_DAMAGE = 12020;   // 武器伤害提升（万分比，能源系统模块常见）
const EFFECT_HIT = 12010;             // 命中提升（万分比，指挥/信息系统模块）
const EFFECT_HIT_ANTI = 12012;        // 对舰/对空命中提升（万分比）
const EFFECT_SPEED = 1;               // 常规移速提升（万分比，动力系统模块）
const EFFECT_CURVATURE = 2;           // 曲率移速提升（万分比，动力系统模块）
const EFFECT_CRIT = 12030;            // 暴击提升（万分比，武器系统模块）
const EFFECT_REPAIR = 12050;          // 维修效率提升（万分比，维修系统模块）

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

/** 所有启用系统的模块面板属性聚合（不限于装甲系统） */
interface ModulePanelEffects {
  resistance: number;        // EID=10033 绝对值
  shield: number;            // EID=10021 百分比
  structurePermille: number; // EID=10 万分比
  // 按武器类型分组的伤害加成（万分比）key='all'通用 或 WEAPON_TYPE 数字字符串
  weaponDamagePermille: Record<string, number>;
  hitPermille: number;          // EID=12010/12012 命中（万分比）
  speedPermille: number;        // EID=1 常规移速（万分比）
  curvaturePermille: number;    // EID=2 曲率移速（万分比）
  critPermille: number;         // EID=12030 暴击（万分比）
  repairPermille: number;       // EID=12050 维修效率（万分比）
}

/**
 * TARGET_MODULE_TYPE → 武器匹配 key 映射
 * 决定模块效果作用于哪类武器（火力计算时按武器 damageType/weaponType 匹配）
 * 20200=能量武器 → 按 damageType='energy' 匹配（不是 WEAPON_TYPE）
 * 201-206=具体武器类型 → 按 WEAPON_TYPE 匹配
 */
const TMT_TO_WEAPON_KEYS: Record<number, string[]> = {
  201: ['wt:3'],        // 火炮
  202: ['wt:4'],        // 轨道炮
  203: ['wt:7'],        // 离子炮
  204: ['wt:5'],        // 脉冲炮
  205: ['wt:2'],        // 导弹
  206: ['wt:6'],        // 鱼雷/投射
  20200: ['dt:energy'], // 能量武器(按damageType匹配, 跨WEAPON_TYPE)
};

/**
 * ★遍历所有启用系统的 cat=0 模块，按 EFFECT_ID 聚合面板属性加成。
 * 之前 getBaseDefense 只查装甲系统(SYSTEM_TYPE=4)，漏掉了能源/指挥/动力/信息等系统的模块效果。
 * 本函数补全：所有系统的模块自带面板属性都聚合进来。
 */
function getAllModuleEffects(
  store: ClientDataStore,
  shipId: string,
  enabledSlots?: string[]
): ModulePanelEffects {
  const result: ModulePanelEffects = {
    resistance: 0, shield: 0, structurePermille: 0,
    weaponDamagePermille: {}, hitPermille: 0, speedPermille: 0,
    curvaturePermille: 0, critPermille: 0, repairPermille: 0,
  };
  const moduleEffect = store.moduleEffect as Record<string, Record<string, unknown>> | undefined;
  const slots = store.shipSlot as Record<string, unknown[]> | undefined;
  const systems = store.shipSystem as Record<string, Record<string, unknown>> | undefined;
  if (!moduleEffect || !slots || !systems) return result;

  const enabledSysSet = resolveEnabledSystems(systems, shipId, enabledSlots);

  // 收集所有启用系统的 cat=0 模块 ID
  const moduleIds = new Set<string>();
  for (const slotId in slots) {
    if (!slotId.startsWith(shipId)) continue;
    const row = slots[slotId];
    if (Number(row[0]) !== 0) continue; // cat=0 模块槽
    const modId = String(row[2]);
    if (!modId || modId === '0') continue;
    const sysId = slotId.slice(0, 7);
    if (enabledSysSet && !enabledSysSet.has(sysId)) continue;
    moduleIds.add(modId);
  }

  // 聚合每个模块的 module_effect
  for (const modId of moduleIds) {
    for (const key in moduleEffect) {
      if (!key.startsWith(modId)) continue;
      const eff = moduleEffect[key];
      const eid = Number(eff.EFFECT_ID);
      const param = Number(eff.EFFECT_PARAM) || 0;
      const tmt = Number(eff.TARGET_MODULE_TYPE) || 0;
      switch (eid) {
        case EFFECT_RESIST: result.resistance += param; break;
        case EFFECT_SHIELD: result.shield += param; break;
        case EFFECT_STRUCTURE_HP: result.structurePermille += param; break;
        case EFFECT_WEAPON_DAMAGE: {
          // 按 TARGET_MODULE_TYPE 分发（wt:X=按WEAPON_TYPE, dt:X=按damageType, 无TMT='all'）
          const wkeys = tmt ? (TMT_TO_WEAPON_KEYS[tmt] ?? ['all']) : ['all'];
          for (const wk of wkeys) {
            result.weaponDamagePermille[wk] = (result.weaponDamagePermille[wk] ?? 0) + param;
          }
          break;
        }
        case EFFECT_HIT:
        case EFFECT_HIT_ANTI: result.hitPermille += param; break;
        case EFFECT_SPEED: result.speedPermille += param; break;
        case EFFECT_CURVATURE: result.curvaturePermille += param; break;
        case EFFECT_CRIT: result.critPermille += param; break;
        case EFFECT_REPAIR: result.repairPermille += param; break;
      }
    }
  }
  return result;
}

// ===== 4. 总入口 =====

/**
 * 计算蓝图完整面板数据
 * @param store 配置数据
 * @param shipId 5位舰船ID
 * @param shipName 舰名（用于推断ship_type取抵抗）
 * @param blueprint resolveBlueprint的结果（含强化加成，可选）
 */

/** WEAPON_TYPE → TARGET_MODULE_TYPE 反向映射 */
const WEAPON_TYPE_TO_TMT: Record<number, number> = {
  3: 201,   // 火炮
  4: 202,   // 轨道炮
  7: 203,   // 离子炮
  5: 204,   // 脉冲炮
  2: 205,   // 导弹
  6: 206,   // 鱼雷/投射
};

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

  // Layer1 模块基础属性: 所有系统的模块效果聚合（不限于装甲系统）
  const modEffects = getAllModuleEffects(store, shipId, enabledSlots);
  const resistance = modEffects.resistance + (blueprint?.resistanceBonus ?? 0);
  const shield = modEffects.shield;

  // ★模块结构加成（Layer1）: EID=10 万分比 × 出厂基础值
  const moduleStructureBonus = Math.floor((baseStructure * modEffects.structurePermille) / PERCENTile);
  // 骨架结构 = Layer0 + Layer1（强化系数作用于这个完整骨架）
  const skeletonStructure = baseStructure + moduleStructureBonus;

  // ★速度: 基础值 × (1 + 模块移速加成 + 强化加成 + 巅峰常规移速加成)
  const speedBonusTotal = modEffects.speedPermille + (blueprint?.speedBonus ?? 0);
  const speed = Math.round(baseSpeed * (1 + speedBonusTotal / PERCENTile));

  // ★曲率速度: 基础值 × (1 + 模块曲率加成 + 强化曲率加成 + 巅峰曲率加成)
  const baseCurvature = shipRow ? Number(shipRow[8]) : 0;
  const curvatureBonusTotal = modEffects.curvaturePermille + (blueprint?.curvatureSpeedBonus ?? 0) + (blueprint?.peakCurvatureSpeedBonus ?? 0);
  const curvatureSpeed = Math.round(baseCurvature * (1 + curvatureBonusTotal / PERCENTile));

  // 武器装配+火力（按 enabledSlots 过滤可选模块）
  // ★模块武器伤害加成(EID=12020)按 TARGET_MODULE_TYPE 分发到对应武器类型
  const weapons = resolveShipWeapons(store, shipId, enabledSlots);
  // 构建 effectList（蓝图强化 + 模块效果）
  const effectList = (blueprint?.effectList ?? []).slice();
  // 模块武器伤害加成转为 EffectEntry
  for (const k of Object.keys(modEffects.weaponDamagePermille)) {
    const val = modEffects.weaponDamagePermille[k];
    if (!val) continue;
    const WTT: Record<number,number> = {3:201,4:202,7:203,5:204,2:205,6:206};
    let tmt = 0;
    if (k.startsWith("wt:")) tmt = WTT[parseInt(k.slice(3))] ?? 0;
    else if (k === "dt:energy") tmt = 20200;
    effectList.push({ effectId: 12020, value: val, sourceSlotId: shipId + "00", targetShip: 0, targetSystem: 0, targetIndex: 0, targetModuleType: tmt, targetCompany: 0, isSystemEffect: false });
  }
  const firepower = computeFirepower(weapons, effectList, store);

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
