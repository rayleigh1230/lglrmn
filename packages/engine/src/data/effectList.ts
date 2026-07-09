/**
 * 统一强化效果表 —— 对齐客户端 get_effect_list + calc_effect_add + 各 Calculator
 *
 * 客户端架构：所有强化来源（普通/巅峰/调校/模块）收进同一个 effectList，
 * 统一走 calc_effect_add 按 cfg_weapon_num_attr 表分通道、is_valid_effect 判作用域。
 *
 * 本模块实现：
 *   1. EffectEntry        对齐客户端 EffectInfo
 *   2. isValidEffect      对齐 is_valid_effect (docs/16 §三)
 *   3. getEnhanceAdd      对齐 calc_effect_add + get_cur_enhance_add_info
 *   4. evalEnhanceBasic   对齐 EnhanceBasic.expression
 *   5. evalAttack         对齐 get_weapon_attack_calc (per dps_type, C_RATIO+skill通道)
 *   6. computeWeaponDps   对齐 get_weapon_dps_dph_calc
 *   7. computeFirepower   对齐 get_ship_dps (主入口)
 */
import type { ClientDataStore } from "./index.js";
import { SHIP } from "./index.js";
import type { AssembledWeapon } from "./blueprintCalc.js";

// ===== DPS 类型枚举 =====
/** 0=对舰, 1=对空, 2=攻城。对齐客户端 MA_MODULE_DPS/AIR_DPS/COEF_DPS */
export const DPS_TYPE = { ANTI_SHIP: 0, ANTI_AIR: 1, SIEGE: 2 } as const;
type DpsType = typeof DPS_TYPE[keyof typeof DPS_TYPE];

// ===== EffectEntry（对齐客户端 EffectInfo）=====
/** 一条强化效果。对齐客户端 EffectInfo(system_id, effect_record, cur_level, max_level, is_system_effect) */
export interface EffectEntry {
  effectId: number;
  value: number;          // 缩放后原始值（B类 PARAM×lv/maxLv，A类查 PARAM_LEVEL；单位取决于通道）
  sourceSlotId: string;   // 来源系统 slotId（7位）
  targetShip: number;     // TARGET_SHIP
  targetSystem: number;   // TARGET_SYSTEM（ALL=0/SELF=1/MAIN=2/OTHER=3）
  targetIndex: number;    // TARGET_INDEX
  targetModuleType: number; // TARGET_MODULE_TYPE（6位编码）
  targetCompany: number;  // TARGET_COMPANY
  isSystemEffect: boolean;// true=系统强化, false=模块自带效果
}

// ===== 常量（从客户端源码 + docs/16）=====
const DEFAULT_ARMOR = 10;
const AIRBORNE_HIT_RATE = 60;   // configdata.AIRBORNE_WEAPON_HIT_RATE
const SHIPBORNE_HIT_RATE = 15;  // configdata.SHIPBORNE_WEAPON_HIT_RATE

/** 客户端 get_weapon_attack_calc 的 invalid_effect_list 排除集（EID 常量值） */
// EFFECT_AIRCRAFT_INC = 12062 (对空伤害), EFFECT_DESTROY_INC = 12060 (攻城伤害)
// ALL_ANIT_AIR_EFFECT_ID 集合（防空专用 EID 组）
const EID_AIRCRAFT_INC = 12062;
const EID_DESTROY_INC = 12060;
const ALL_ANTIAIR_EFFECT_IDS = new Set([
  12062, 12300, 12301, 12305, 12306, 12310, 12311,
  12411, 12412, 12413,
]);

/** 对空 skill_effect_ratio 通道（已实现，对齐反编译 collect_skill_effect_ratio）：
 *  对 MA_MODULE_AIR_DPS，duration/cd 走 (100+add_ratio+skill_ratio)/100，其中 skill_ratio 来自模块
 *  EFFECT_AIRCRAFT_WEAPON_DURATION_INC(12310)+DEC(12311) / CD_TIME_INC(12305)+DEC(12306)，
 *  DEC 取负。这些 EID 不进 weaponNumAttr 三通道，在 blueprintCalc.ts 装配时合成 airDurSkillRatio/airCdSkillRatio，
 *  在 computeWeaponDps 的 duration/cd 通道传入 evalEnhanceBasic 的 skillRatio 参数。 */

// ===== attr 匹配（对齐 calc_effect_add 的 ATTR/TABLE 检查）=====
function attrMatch(attr: string, rec: { EFFECT_ATTR_NAME: string; TABLE_NAME: string }): boolean {
  const key = rec.TABLE_NAME
    ? `Tb_${rec.TABLE_NAME}.${rec.EFFECT_ATTR_NAME.toUpperCase()}`
    : rec.EFFECT_ATTR_NAME;
  const norm = attr.replace('flight_time_after_cd', 'flight_time_before_cd');
  return norm === key || norm === rec.EFFECT_ATTR_NAME;
}

// ===== isValidEffect（照抄 docs/16 §三）=====
const TARGET_SYS_ALL   = 0;
const TARGET_SYS_SELF  = 1;
const TARGET_SYS_MAIN  = 2;
const TARGET_SYS_OTHER = 3;
const WEAPON_FILTER_ENERGY_VAL = 10000;

function isValidEnhanceSystem(
  systemId: number, compareId: number, targetSys: number,
  shipSystem?: Record<string, Record<string, unknown>>,
): boolean {
  if (!systemId) return true;
  if (targetSys === TARGET_SYS_ALL)  return true;
  if (targetSys === TARGET_SYS_SELF) return systemId === compareId;
  if (targetSys === TARGET_SYS_OTHER)return systemId !== compareId;
  if (targetSys === TARGET_SYS_MAIN) {
    const cfg = shipSystem?.[String(systemId)];
    return Number(cfg?.MAIN_SYSTEM ?? 0) === TARGET_SYS_SELF;
  }
  return false;
}

function getSlotIndex(slotId: number, shipSlot?: Record<string, unknown[]>): number {
  if (!shipSlot) return 0;
  const systemId = Math.floor(slotId / 100);
  const slots: number[] = [];
  for (const k in shipSlot) {
    if (Math.floor(Number(k) / 100) === systemId) slots.push(Number(k));
  }
  slots.sort((a, b) => a - b);
  for (let i = 0; i < slots.length; i++) {
    if (slots[i] === slotId) return i + 1;
  }
  return 0;
}

function isValidEffect(
  e: EffectEntry, w: AssembledWeapon, weaponSlotId: string,
  shipSystem?: Record<string, Record<string, unknown>>,
  shipSlot?: Record<string, unknown[]>,
): boolean {
  const weaponSystemId = Number(weaponSlotId.slice(0, 7));
  // 1. TARGET_SYSTEM
  if (!isValidEnhanceSystem(weaponSystemId, Number(e.sourceSlotId), e.targetSystem, shipSystem)) return false;
  // 2. TARGET_INDEX
  if (e.targetIndex > 0) {
    if (e.targetIndex !== getSlotIndex(Number(weaponSlotId), shipSlot)) return false;
  }
	  // 3. TARGET_MODULE_TYPE（6位编码：前2位过滤器/中位模块类型/末位武器类型）
	  if (e.targetModuleType) {
	    const tmt = e.targetModuleType;
	    const filterType = Math.floor(tmt / 10000);  // 前2位：武器过滤器
	    const effectModuleType = Math.floor(tmt / 100) % 10; // 中位：模块类型
	    const weaponType = tmt % 10;                  // 末位：武器类型
	    if (filterType === WEAPON_FILTER_ENERGY_VAL) return w.damageType === 'energy';
	    // 模块类型匹配（中位，对齐 cfg_module[0].MODULE_TYPE）
	    if (effectModuleType && effectModuleType !== w.moduleType) return false;
	    if (weaponType === 0) return true;
	    return weaponType === w.weaponType;
	  }
  return true;
}

// ===== evalEnhanceBasic（对齐 EnhanceBasic.expression + get_after_system_effect_value）=====
/** 完整公式（对齐反编译 get_after_system_effect_value）：
 *   ret = (base + addBase) × (100 + addRatio + skillRatio) / 100 + addNum
 *   skillRatio 默认 0（大多数 attr 无 skill_effect_ratio 通道）。
 *   只有防空的 duration/cd_time 两类 attr 有非零 skillRatio（来自 collect_skill_effect_ratio）。
 */
function evalEnhanceBasic(base: number, addBase: number, addRatio: number, addNum: number, skillRatio = 0): number {
  return (base + addBase) * (100 + addRatio + skillRatio) / 100 + addNum;
}

// ===== getEnhanceAdd（对齐 calc_effect_add + get_cur_enhance_add_info）=====
/**
 * 对指定 attr 聚合 effectList 中所有生效效果的三通道。
 * @param invalidEffectIds 排除的 EID 集合（对齐 get_weapon_attack_calc 的 invalid_effect_list）
 */
function getEnhanceAdd(
  effectList: EffectEntry[],
  attr: string,
  invalidEffectIds: Set<number>,
  w: AssembledWeapon,
  shipSystem?: Record<string, Record<string, unknown>>,
  shipSlot?: Record<string, unknown[]>,
  weaponNumAttr?: Record<string, { EFFECT_ATTR_NAME: string; TABLE_NAME: string; EFFECT_TYPE: string }>,
): { addBase: number; addNum: number; addRatio: number } {
  let addBase = 0, addNum = 0, addRatio = 0;
  if (!weaponNumAttr) return { addBase, addNum, addRatio };
  for (const e of effectList) {
    // invalid 排除（对齐客户端 get_cur_enhance_add: if effect_id in invalid_effect_list: continue）
    if (invalidEffectIds.has(e.effectId)) continue;
    // 作用域判定
    if (!isValidEffect(e, w, w.slotId, shipSystem, shipSlot)) continue;
    // 查 weaponNumAttr（不在表→无效，对齐 calc_effect_add: if not weapon_num_attr: return 0）
    const rec = weaponNumAttr[String(e.effectId)];
    if (!rec) continue;
    // ATTR/TABLE 匹配
    if (!attrMatch(attr, rec)) continue;
    // 按 EFFECT_TYPE 分通道
    switch (rec.EFFECT_TYPE) {
      case 'ratio_add':     addRatio += e.value; break;
      case 'ratio_del':     addRatio -= e.value; break;
      case 'num_add':       addNum   += e.value; break;
      case 'num_del':       addNum   -= e.value; break;
      case 'base_num_add':  addBase  += e.value; break;
      case 'base_num_del':  addBase  -= e.value; break;
    }
  }
  return { addBase, addNum, addRatio };
}

/** 对指定 valid EID 集合取 addRatio 求和（对齐对空 skill_effect_ratio 通道） */
function sumSkillRatio(
  effectList: EffectEntry[],
  validEidSet: Set<number>,
  w: AssembledWeapon,
  shipSystem?: Record<string, Record<string, unknown>>,
  shipSlot?: Record<string, unknown[]>,
): number {
  let r = 0;
  for (const e of effectList) {
    if (!validEidSet.has(e.effectId)) continue;
    if (!isValidEffect(e, w, w.slotId, shipSystem, shipSlot)) continue;
    r += e.value;
  }
  return r;
}

// ===== attack 配置（对齐 get_weapon_attack_calc 的 per-dps_type 分支）=====
interface AttackConfig {
  invalidEffectIds: Set<number>;  // invalid_effect_list
  ratio: number;                  // C_RATIO（对舰=100, 对空=AIRCRAFT_COEF, 攻城=DESTROY_COEF）
  skillRatioEidInc: number;       // EFFECT_AIRCRAFT_INC(12062) 或 EFFECT_DESTROY_INC(12060)，0=无
  skillBaseEidSet: Set<number>;   // ALL_ANIT_AIR_EFFECT_ID 或空
}

function buildAttackConfig(dpsType: DpsType, w: AssembledWeapon): AttackConfig {
  const antiAirEids = ALL_ANTIAIR_EFFECT_IDS;
  switch (dpsType) {
    case DPS_TYPE.ANTI_SHIP:
      return {
        invalidEffectIds: new Set([EID_AIRCRAFT_INC, EID_DESTROY_INC, ...antiAirEids]),
        ratio: 100, skillRatioEidInc: 0, skillBaseEidSet: new Set(),
      };
    case DPS_TYPE.ANTI_AIR:
      return {
        invalidEffectIds: new Set([EID_DESTROY_INC]),
        ratio: w.aircraftCoef, skillRatioEidInc: EID_AIRCRAFT_INC,
        skillBaseEidSet: antiAirEids,
      };
    case DPS_TYPE.SIEGE:
      return {
        invalidEffectIds: new Set([EID_AIRCRAFT_INC, ...antiAirEids]),
        ratio: w.destroyCoef, skillRatioEidInc: EID_DESTROY_INC,
        skillBaseEidSet: new Set(),
      };
  }
}

// ===== evalAttack（对齐 get_weapon_attack_calc + AttackCalculator.expression）=====
/**
 * AttackCalculator.expression:
 *   (C_RATIO/100) × ((C_BASE_NUM + V_ADD_BASE_NUM + V_SKILL_EFFECT)
 *                    × (100 + V_ADD_RATIO + V_SKILL_EFFECT_RATIO) / 100 + V_ADD_NUM)
 *
 * @param w 武器（取 dph=C_BASE_NUM, aircraftCoef/destroyCoef=C_RATIO）
 * @param dpsType 0=对舰/1=对空/2=攻城
 * @param effectList 统一强化效果表
 * @param extraSkillRatio 额外技能 ratio（模块 EFFECT_AIRCRAFT_INC / EFFECT_DESTROY_INC，通过 effectList 已有）
 */
function evalAttack(
  w: AssembledWeapon, dpsType: DpsType, effectList: EffectEntry[],
  shipSystem?: Record<string, Record<string, unknown>>, shipSlot?: Record<string, unknown[]>,
  weaponNumAttr?: Record<string, { EFFECT_ATTR_NAME: string; TABLE_NAME: string; EFFECT_TYPE: string }>,
): number {
  const cfg = buildAttackConfig(dpsType, w);
  // 三通道（含 invalid 排除）
  const { addBase, addNum, addRatio } = getEnhanceAdd(effectList, 'action_param', cfg.invalidEffectIds, w, shipSystem, shipSlot, weaponNumAttr);
  // V_SKILL_EFFECT（对空的 ALL_ANIT_AIR 组 → base 通道）
  let skillBase = cfg.skillBaseEidSet.size > 0
    ? sumSkillRatio(effectList, cfg.skillBaseEidSet, w, shipSystem, shipSlot) : 0;
  // 模块 airBaseBonus（EID=12300，不进 effectList，直接 +dph）
  if (dpsType === DPS_TYPE.ANTI_AIR) skillBase += w.airBaseBonus;
  // ★V_SKILL_EFFECT_RATIO（对齐 get_weapon_attack_calc 的 skill_effect_ratio 绑定）：
  //   客户端从武器**模块自带** cfg_module_effect 取原值（get_module_effect_ori_value_info，不缩放）：
  //     所有 dpsType: EFFECT_DAMAGE_INC(12020) = w.modDamageInc
  //     对空追加: EFFECT_AIRCRAFT_INC(12062) = w.modAircraftInc
  //     攻城追加: EFFECT_DESTROY_INC(12060) = w.modDestroyInc
  //   旧实现 skillRatio=0 → 这3类模块加成全丢（仅影响有此效果的武器，普通武器为0不影响锺点）。
  let skillRatio = w.modDamageInc;
  if (dpsType === DPS_TYPE.ANTI_AIR) skillRatio += w.modAircraftInc;
  else if (dpsType === DPS_TYPE.SIEGE) skillRatio += w.modDestroyInc;

  // AttackCalculator.expression
  return (cfg.ratio / 100) * (
    (w.dph + addBase + skillBase) * (100 + addRatio + skillRatio) / 100 + addNum
  );
}

// ===== computeWeaponDps（对齐 get_weapon_dps_dph_calc）=====
/**
 * get_weapon_dps_dph_calc:
 *   final = action_times × repeat_times × attack × 60 × installNum
 *           / (duration + cd_time + flight_before + flight_after)
 */
function computeWeaponDps(
  w: AssembledWeapon, dpsType: DpsType, effectList: EffectEntry[],
  shipSystem?: Record<string, Record<string, unknown>>, shipSlot?: Record<string, unknown[]>,
  weaponNumAttr?: Record<string, { EFFECT_ATTR_NAME: string; TABLE_NAME: string; EFFECT_TYPE: string }>,
): number {
  if (w.dph <= 0) return 0;
  if (w.actionType !== 1 && w.actionType !== 2) return 0; // 只处理 energy/ballistic

  // attack（per dps_type 独立 C_RATIO + skill 通道）
  let attack = evalAttack(w, dpsType, effectList, shipSystem, shipSlot, weaponNumAttr);

  // ★对舰穿抗（对齐客户端 get_weapon_dps_dph_calc：
  //   if MA_MODULE_DPS and action==BALLISTIC: attack = max(attack*armor/100, attack-armor)）
  if (dpsType === DPS_TYPE.ANTI_SHIP && w.actionType === 2) {
    attack = Math.max(attack * DEFAULT_ARMOR / 100, attack - DEFAULT_ARMOR);
  }

  // duration（毫秒值走 EnhanceBasic / 1000）
  const durCh = getEnhanceAdd(effectList, 'duration', new Set(), w, shipSystem, shipSlot, weaponNumAttr);
  // ★防空 skill_effect_ratio 通道（对齐 collect_skill_effect_ratio）：
  //   对 MA_MODULE_AIR_DPS，duration 走 (100+add_ratio+skill_ratio)/100，skill_ratio = DUR_INC(12310)−DUR_DEC(12311)。
  //   旧实现把 airDurReduction(=DUR_DEC) 从 addRatio 减 —— 数值等价（仅 DEC 时），但漏了 INC。现已合成带符号 skill_ratio。
  const durSkillRatio = dpsType === DPS_TYPE.ANTI_AIR ? w.airDurSkillRatio : 0;
  const duration = evalEnhanceBasic(w.fireDuration * 1000, durCh.addBase, durCh.addRatio, durCh.addNum, durSkillRatio) / 1000;

  // cd_time
  const cdCh = getEnhanceAdd(effectList, 'cd_time', new Set(), w, shipSystem, shipSlot, weaponNumAttr);
  // ★防空 skill_effect_ratio：cd 走 (100+add_ratio+skill_ratio)/100，skill_ratio = CD_INC(12305)−CD_DEC(12306)
  const cdSkillRatio = dpsType === DPS_TYPE.ANTI_AIR ? w.airCdSkillRatio : 0;
  const cdTime = evalEnhanceBasic(w.cooldown * 1000, cdCh.addBase, cdCh.addRatio, cdCh.addNum, cdSkillRatio) / 1000;

  // flight_before / flight_after（共享 flight_time_before_cd 通道）
  const flCh = getEnhanceAdd(effectList, 'flight_time_before_cd', new Set(), w, shipSystem, shipSlot, weaponNumAttr);
  const flightB = evalEnhanceBasic(w.flightBefore * 1000, flCh.addBase, flCh.addRatio, flCh.addNum) / 1000;
  const flightA = evalEnhanceBasic(w.flightAfter * 1000, flCh.addBase, flCh.addRatio, flCh.addNum) / 1000;

  // repeat_times（num_add 绝对值）
  const repCh = getEnhanceAdd(effectList, 'repeat_times', new Set(), w, shipSystem, shipSlot, weaponNumAttr);
  const repeatTimes = w.attackCount + repCh.addNum;
  const actionTimes = w.attackRounds;

  const period = duration + cdTime + flightB + flightA;
  if (period <= 0) return 0;

  return actionTimes * repeatTimes * attack * 60 * w.installNum / period;
}

// ===== computeFirepower（对齐 get_ship_dps）=====
/**
 * 计算面板火力（对舰/防空/攻城）—— 对齐客户端 get_ship_dps:
 *   ship_dps = Σ get_weapon_ship_dps × group_num + get_aircraft_dps
 *
 * @param weapons 装配出的武器列表
 * @param effectList 统一强化效果表（已含普通+巅峰+调校+模块效果）
 * @param store 配置表存储（weaponNumAttr/shipSystem/shipSlot/ship）
 */
export function computeFirepower(
  weapons: AssembledWeapon[],
  effectList: EffectEntry[],
  store?: ClientDataStore,
): { antiShip: number; antiAir: number; siege: number } {
  const weaponNumAttr = store?.weaponNumAttr;
  const shipSystem = store?.shipSystem as Record<string, Record<string, unknown>> | undefined;
  const shipSlot = store?.shipSlot as Record<string, unknown[]> | undefined;

  // ★每武器先 floor 再求和（对齐客户端 get_ship_dps_calc 的 _add_new_calc: to_int 每武器）。
  //   客户端：Σ floor(weapon_dps) × group_num，末尾 int()。
  //   旧实现 sum-then-round 在多武器+大 group_num 时会偏大（如战机护航艇）。
  // === 对舰 ===
  let antiShip = 0;
  for (const w of weapons) {
    if (!w.canTargetShip) continue;
    antiShip += Math.floor(computeWeaponDps(w, DPS_TYPE.ANTI_SHIP, effectList, shipSystem, shipSlot, weaponNumAttr));
  }
  // 攻城
  let siege = 0;
  for (const w of weapons) {
    if (!w.canTargetDestroy || w.destroyCoef <= 0) continue;
    siege += Math.floor(computeWeaponDps(w, DPS_TYPE.SIEGE, effectList, shipSystem, shipSlot, weaponNumAttr));
  }
  // 防空（对空路径：dps × air_ratio/100 × fixed_hit_rate，整体作为单武器贡献 floor）
  let antiAir = 0;
  for (const w of weapons) {
    if (!w.canTargetAircraft || w.antiaircraftRatio <= 0) continue;
    const baseAirDps = computeWeaponDps(w, DPS_TYPE.ANTI_AIR, effectList, shipSystem, shipSlot, weaponNumAttr);
    const hitRate = (w.shipType === 1 || w.shipType === 2)
      ? AIRBORNE_HIT_RATE / 100 : SHIPBORNE_HIT_RATE / 100;
    antiAir += Math.floor(baseAirDps * (w.antiaircraftRatio / 100) * hitRate);
  }

  // group_num（对齐客户端 get_ship_dps: ship_dps = int(Σfloor × aircraft_group_num)）
  let groupNum = 1;
  if (store?.ship && weapons.length > 0) {
    const sid = weapons[0].slotId.slice(0, 5);
    const shipRow = store.ship[sid] as unknown[] | undefined;
    if (shipRow) groupNum = Number(shipRow[SHIP.AIRCRAFT_GROUP_NUM] ?? 1) || 1;
  }
  antiShip = Math.floor(antiShip * groupNum);
  antiAir = Math.floor(antiAir * groupNum);
  siege = Math.floor(siege * groupNum);

  return { antiShip, antiAir, siege };
}
