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
  shotsPerCycle: number;  // 每周期发数（cfg_weapon_action[3]）
  fireDuration: number;   // 持续开火时长秒（cfg_weapon_action[4]/1000）
  cooldown: number;       // 冷却秒（cfg_weapon.CD_TIME/1000）
  weaponType: number;     // WEAPON_TYPE（2导弹/3火炮/4轨道炮/5能量/6投射/7离子/8特殊）
  specialTargetLogic: number; // SPECIAL_TARGET_LOGIC（2对舰/8防空/10反导）
  isAirborne: boolean;    // 是否机载（战机/艇自身 或 无人机/载机系统的武器）
  category: WeaponCategory; // 火力归类(对舰/防空/攻城)
}

// ===== 蓝图面板 =====
export interface BlueprintPanel {
  shipId: string;
  // 基础属性
  structure: number;       // 基础结构值
  finalStructure: number;  // 含强化的最终结构
  resistance: number;      // 抵抗值（基础+加成）
  shield: number;          // 护盾百分比 0~1
  speed: number;           // 普通移速（含加成）
  curvatureSpeedBonus: number; // 曲率速度加成（万分比，基础值未知）
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
 * 从 cfg_ship_slot 装配舰船的所有武器
 * @param store 配置数据
 * @param shipId 5位舰船ID
 */
export function resolveShipWeapons(store: ClientDataStore, shipId: string): AssembledWeapon[] {
  const slots = store.shipSlot as Record<string, unknown[]> | undefined;
  const weapons = store.weapon as Record<string, Record<string, unknown>> | undefined;
  const actions = store.weaponAction as Record<string, number[]> | undefined;
  const systems = store.shipSystem as Record<string, Record<string, unknown>> | undefined;
  if (!slots || !weapons || !actions) return [];

  const result: AssembledWeapon[] = [];
  const seen = new Set<string>(); // 同 weaponId 去重(一个武器可能挂在多个槽)

  for (const slotId in slots) {
    if (!slotId.startsWith(shipId)) continue;
    const row = slots[slotId];
    const cat = Number(row[0]); // 0=模块, 1=主武, 2=副武
    if (cat !== 1 && cat !== 2) continue; // 只取武器槽
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
    const shotsPerCycle = Number(action[3]) || 1;
    const fireDurationMs = Number(action[4]) || 0;
    const cdTime = Number(w.CD_TIME) || Number(w.ATTACK_INTERVAL) || 0;
    const weaponType = Number(w.WEAPON_TYPE) || 0;
    const specialTargetLogic = Number(w.SPECIAL_TARGET_LOGIC) || 0;

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
      shotsPerCycle,
      fireDuration: fireDurationMs / 1000,
      cooldown: cdTime / 1000,
      weaponType,
      specialTargetLogic,
      isAirborne,
      category,
    });
  }
  return result;
}

// ===== 2. 火力计算 =====

/**
 * 计算面板火力（对舰/防空/攻城）—— 单位：每分钟伤害（DPM）
 *
 * 公式（面板口径，非实战）：
 *   单发处理后伤害（默认抵抗10）:
 *     实弹(weaponType 2/3/4/6): max(dph - 10, dph × 0.1)
 *     能量(weaponType 5/7/8):   dph × (1 - 0)  护盾默认0
 *   周期秒 = fireDuration + cooldown
 *   每分钟发数 = shotsPerCycle / 周期秒 × 60
 *
 *   对舰火力 = Σ 舰载对舰武器: 单发处理后 × 每分钟发数 × 100%命中
 *   防空火力 = Σ 所有武器: 单发处理后 × 每分钟发数 × 命中口径(舰载15%/机载60%)
 *   攻城火力 = Σ 攻城武器: 单发处理后 × 每分钟发数 × 100%
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
    const shotsPerMin = (w.shotsPerCycle / period) * 60; // 每分钟发数

    // 单发处理后伤害（默认抵抗10）
    const isEnergy = w.weaponType === 5 || w.weaponType === 7 || w.weaponType === 8;
    let perHit: number;
    if (isEnergy) {
      perHit = w.dph; // 能量，护盾默认0
    } else {
      perHit = Math.max(w.dph - 10, w.dph * 0.1); // 实弹，抵抗10
    }

    // 应用蓝图武器伤害加成（按系统标签分组，万分比）
    const dmgBonusKey = w.systemLabel || "";
    const weaponDmgBonus = (blueprint?.weaponDamageBonus?.[dmgBonusKey] ?? 0) / PERCENTile;
    const baseDmgBonus = (blueprint?.baseDamageBonus ?? 0); // 绝对值+dph
    perHit = (perHit + baseDmgBonus) * (1 + weaponDmgBonus);

    const dps = perHit * shotsPerMin;

    // 累加到对应火力
    if (w.category === "siege") {
      const siegeBonus = 1 + (blueprint?.siegeDamageBonus ?? 0) / PERCENTile;
      siege += dps * siegeBonus;
    } else if (w.category === "antiAir") {
      // 防空: 面板口径
      const hitRate = w.isAirborne ? 0.6 : 0.15;
      const aaBonus = 1 + (blueprint?.antiAirDamageBonus ?? 0) / PERCENTile;
      antiAir += dps * hitRate * aaBonus;
    } else {
      // 对舰: 100%命中
      antiShip += dps;
    }
  }

  return {
    antiShip: Math.round(antiShip),
    antiAir: Math.round(antiAir),
    siege: Math.round(siege),
  };
}

// ===== 3. 防御属性 =====

/** EFFECT_ID 常量 */
const EFFECT_RESIST = 10033;  // 物理抵抗值（绝对值）
const EFFECT_SHIELD = 10021;  // 能量护盾（万分比）

/**
 * 从 cfg_ship_slot 找装甲系统的模块ID（cat=0 的槽，SYSTEM_LABEL='装甲'）
 * 装甲系统的 slotId 前7位 = shipId(5) + slot(2)
 * 在 cfg_ship_slot 里找以该 systemId 开头且 cat=0 的记录，取 weaponId（即 moduleId）
 */
function getArmorModuleIds(
  store: ClientDataStore,
  shipId: string
): string[] {
  const slots = store.shipSlot as Record<string, unknown[]> | undefined;
  const systems = store.shipSystem as Record<string, Record<string, unknown>> | undefined;
  if (!slots || !systems) return [];

  // 找装甲系统的 systemId（SYSTEM_LABEL='装甲' 或 SYSTEM_TYPE=4）
  const armorSystemIds: string[] = [];
  for (const k in systems) {
    if (!k.startsWith(shipId)) continue;
    const s = systems[k];
    if (s.SYSTEM_LABEL === "装甲" || s.SYSTEM_TYPE === 4) {
      armorSystemIds.push(k); // 7位 systemId
    }
  }

  // 从 cfg_ship_slot 找装甲系统下的模块（cat=0）
  const moduleIds: string[] = [];
  for (const slotId in slots) {
    const row = slots[slotId];
    if (Number(row[0]) !== 0) continue; // 只取 cat=0（模块）
    const weaponId = String(row[2]);
    if (!weaponId || weaponId === "0") continue;
    // slotId 前7位是否匹配装甲系统
    const sysId = slotId.slice(0, 7);
    if (armorSystemIds.includes(sysId)) {
      moduleIds.push(weaponId);
    }
  }
  return moduleIds;
}

/**
 * 从 module_effect 取装甲的抵抗值和护盾值（基础值）
 * module_effect key = moduleId(5位) + 序号(2位)
 * EFFECT_ID=10033 → 抵抗值（绝对值）
 * EFFECT_ID=10021 → 护盾值（万分比）
 */
export function getBaseDefense(store: ClientDataStore, shipId: string): { resistance: number; shield: number } {
  const moduleEffect = store.moduleEffect as Record<string, Record<string, unknown>> | undefined;
  if (!moduleEffect) return { resistance: 0, shield: 0 };

  const armorModuleIds = getArmorModuleIds(store, shipId);
  let resistance = 0;
  let shield = 0;

  for (const moduleId of armorModuleIds) {
    // 遍历该模块的所有效果（key = moduleId + 序号）
    for (const key in moduleEffect) {
      if (!key.startsWith(moduleId)) continue;
      const eff = moduleEffect[key];
      const effectId = Number(eff.EFFECT_ID);
      const param = Number(eff.EFFECT_PARAM) || 0;
      if (effectId === EFFECT_RESIST) {
        resistance += param;
      } else if (effectId === EFFECT_SHIELD) {
        shield += param; // 万分比
      }
    }
  }

  return { resistance, shield };
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
  blueprint?: ResolvedBlueprint | null
): BlueprintPanel {
  void shipName; // 保留参数兼容性, 抵抗/护盾改从 module_effect 获取
  const shipRow = store.ship?.[shipId] as unknown[] | undefined;
  const baseStructure = shipRow ? Number(shipRow[4]) : 0;
  const baseSpeed = shipRow ? Number(shipRow[5]) : 0;

  // 抵抗/护盾: 从装甲模块的 module_effect 取基础值
  const defense = getBaseDefense(store, shipId);
  const resistance = defense.resistance + (blueprint?.resistanceBonus ?? 0);
  const shield = defense.shield; // module_effect EFFECT_PARAM 直接是百分比值(如 15 = 15%)

  // 速度: 基础值 × (1 + 加成)
  const speed = Math.round(baseSpeed * (1 + (blueprint?.speedBonus ?? 0) / PERCENTile));

  // 武器装配+火力
  const weapons = resolveShipWeapons(store, shipId);
  const firepower = computeFirepower(weapons, blueprint);

  return {
    shipId,
    structure: baseStructure,
    finalStructure: blueprint?.finalStructure ?? baseStructure,
    resistance,
    shield,
    speed,
    curvatureSpeedBonus: blueprint?.curvatureSpeedBonus ?? 0,
    firepower,
    weapons,
  };
}
