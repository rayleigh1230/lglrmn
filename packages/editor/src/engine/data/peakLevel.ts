/**
 * 巅峰等级系统解析器 —— 对齐客户端 `common.blueprint_utils.get_peak_effect`
 *
 * ★ 机制（反编译源码 + 配置数据双证，2026-07-08 全面对齐）：
 *
 * cfg_ship_peak_level.json 的 key = shipId(5) + peakLv(2)，如 6030116 = ST59 巅峰16级。
 * value = [COMMON_EFFECT(字段0), EXCLUSIVE_EFFECT(字段1)]，对齐客户端
 *   `get_peak_effect` 返回的 `(common_dict, exclusive_dict)` 二元组。
 *
 * ★字段0 COMMON_EFFECT（通用加成，全舰系族共享）格式: "slotId,level;slotId,level;..."
 *   - slotId = 7位(基础舰 shipId5 + slot2)，如 6030101
 *   - level = 该槽 optIdx01 的强化等级（巅峰抬升上限:普通4 → 巅峰20）
 *   - 槽01 = 龙骨结构增强(EFFECT_ID=12,绝对值),每级都有
 *   - 槽02 = 引擎出力(EFFECT_ID=14,常规移速%),特定巅峰等级才升级
 *   - 槽03 = 曲率引擎(EFFECT_ID=16,曲率移速%),特定巅峰等级才升级
 *   ★查表归一化：客户端用 main_ship_id = (shipId//10)*10+1 查 field[0]。
 *     数据实证：变体舰行(30102/30103)的 field[0] 恒为空，COMMON 数据只在基础舰行。
 *
 * ★字段1 EXCLUSIVE_EFFECT（巅峰强化奖励，每变体独立）: "enhanceId,level;..."
 *   - enhanceId 是 9位 = slotId(7) + optIdx(2，=70/71)，属 EFFECT_TYPE_ENHANCE_ADD
 *   - 特定巅峰等级才解锁（如斗牛巅峰5解锁slot02奖励）
 *   - 查表用字面 shipId（非归一化）
 *   ★注：这是"巅峰强化奖励"，不是"调校"。真正的调校(ADJUST，optIdx31-43)在 tuneSystem.ts。
 *
 * ★ 数值来源:查船级专属 effect 表 cfg_system_effect[slotId + "01"].EFFECT_PARAM_LEVEL 第 level 行。
 *   该表本身覆盖 1-30 级(如 ST59 龙骨 603010101: lv1=2190, lv16=52680, lv20=66905)。
 *   普通玩家受 ENHANCE_COST 长度限制只能升到4级,巅峰把它抬到20级,读取表中本就存在的行。
 *
 * 巅峰等级判定:cfg_blueprint_peak_level.json 给出 1-19 级的累计经验阈值
 *   (如 巅峰5=20000, 巅峰16=90000)。等级靠道具开启+任务经验提升。
 */
import type { ClientDataStore, RawSystemEffect } from './rawTypes';
import type { EffectEntry } from './effectList';

/** 巅峰强化串解析结果(单个槽位) */
export interface PeakEnhanceEntry {
  /** 7位槽位ID(shipId5 + slot2) */
  slotId: string;
  /** 强化等级(1-20) */
  level: number;
}

/** 巅峰等级快照(从 cfg_ship_peak_level 查得) */
export interface PeakSnapshot {
  /** 巅峰等级(1-20),0 表示无巅峰 */
  peakLevel: number;
  /** 强化串解析结果(字段0,普通强化项等级给定) */
  enhances: PeakEnhanceEntry[];
  /** ★巅峰强化奖励串(字段1,巅峰专属强化项等级给定,optIdx=70/71) */
  rewardEntries: PeakRewardEntry[];
}

/** 巅峰强化奖励条目(field[1] 解析结果) */
export interface PeakRewardEntry {
  /** 9位 enhanceId(slotId 7位 + optIdx 2位=70/71) */
  enhanceId: string;
  /** 该巅峰专属强化项的给定等级 */
  level: number;
}

/** 巅峰强化数值(按 EFFECT_ID 分发后的聚合结果) */
export interface PeakBonus {
  /** 结构加成绝对值(EFFECT_ID=12,龙骨结构增强,每级都有) —— field[0] */
  structureAbsolute: number;
  /** 常规移速加成万分比(EFFECT_ID=14,引擎出力) —— field[0] */
  speedBonus: number;
  /** 曲率移速加成万分比(EFFECT_ID=16,曲率引擎) —— field[0] */
  curvatureSpeedBonus: number;
  /** ★巅峰强化奖励加成 —— field[1]，独立的巅峰专属强化项（特定巅峰等级解锁） */
  reward: PeakRewardBonus;
  /** ★field[1] 所有 reward 的 EffectEntry（进统一 effectList，由 getEnhanceAdd 按表过滤） */
  rewardEffectList: EffectEntry[];
  /** 实际解析到的加成明细(调试用) */
  details: Array<{ slotId: string; level: number; effectId: number; name: string; value: number }>;
}

/** 巅峰强化奖励(field[1])按 EFFECT_ID 分发后的聚合结果 */
export interface PeakRewardBonus {
  /** 结构加成万分比(EFFECT_ID=10,巅峰结构增强) */
  structurePermille: number;
  /** 伤害加成万分比(EFFECT_ID=12350,巅峰武器单发) */
  damagePermille: number;
  /** 维修效率加成万分比(EFFECT_ID=12050,强化维修光束) */
  repairPermille: number;
  /** 奖励明细(调试用) */
  details: Array<{ enhanceId: string; level: number; effectId: number; name: string; value: number }>;
}

/**
 * 解析巅峰强化串(字段0): "slotId,level;slotId,level;..."
 *
 * 与普通战报科技串(三元组 slotId,optIdx,PREFIX,level)不同,
 * 巅峰串是二元组(slotId,level),直接给 optIdx01 的等级。
 */
export function parsePeakEnhanceString(str: string): PeakEnhanceEntry[] {
  if (!str) return [];
  const result: PeakEnhanceEntry[] = [];
  const segments = str.split(';').filter((s) => s.trim().length > 0);
  for (const seg of segments) {
    const parts = seg.split(',').map((p) => p.trim());
    if (parts.length < 2) continue;
    const slotId = parts[0];
    const level = Number(parts[1]);
    if (!slotId || Number.isNaN(level)) continue;
    result.push({ slotId, level });
  }
  return result;
}

/**
 * 解析巅峰强化奖励串(字段1): "enhanceId,level;enhanceId,level;..."
 *
 * ★ 机制(2026-07-04 铁证验证,斗牛40501为锚点):
 * 字段1 是巅峰专属强化项的等级给定，与字段0(普通强化项)平行但独立。
 * enhanceId 是9位 = slotId(7位) + optIdx(2位,=70或71)。
 * 解析链:
 *   1. enhanceId 查 cfg_system_enhance[enhanceId].SYSTEM_EFFECT_PREFIX = effect prefix
 *   2. prefix 直接当 effect prefix 查 cfg_system_effect[prefix+"01"] = 巅峰专属强化项
 *      (NAME 含"巅峰",如"巅峰结构增强"/"巅峰武器单发",与普通强化项不同但同 EFFECT_ID)
 *   3. level 查该 effect 的 EFFECT_PARAM_LEVEL 第 level 行取值
 *
 * 涵盖多类: 结构(EID=10)/伤害(EID=12350)/暴击(EID=12030)/维修(EID=12050)等。
 * 特定巅峰等级才解锁(斗牛:巅峰5解锁slot02奖励,巅峰10解锁slot01奖励)。
 */
export function parsePeakRewardString(str: string): PeakRewardEntry[] {
  if (!str) return [];
  const result: PeakRewardEntry[] = [];
  const segments = str.split(';').filter((s) => s.trim().length > 0);
  for (const seg of segments) {
    const parts = seg.split(',').map((p) => p.trim());
    if (parts.length < 2) continue;
    const enhanceId = parts[0];
    const level = Number(parts[1]);
    if (!enhanceId || Number.isNaN(level)) continue;
    result.push({ enhanceId, level });
  }
  return result;
}

/**
 * @deprecated 旧名,等价于 parsePeakRewardString。field[1] 实为巅峰强化奖励(非调校),
 * 真正的调校系统(optIdx=31-43)在 tuneSystem.ts。保留此函数仅为向后兼容。
 */
export function parseTuneString(str: string): PeakEnhanceEntry[] {
  return parsePeakRewardString(str).map((r) => ({ slotId: r.enhanceId, level: r.level }));
}

/**
 * ★变体舰归一化（对齐客户端 `get_peak_effect`）：
 * COMMON_EFFECT(field[0]) 用基础舰 shipId 查表；EXCLUSIVE(field[1]) 用字面 shipId。
 *
 * 客户端 `get_peak_effect(ship_id)`:
 *   common_dict:  ship_id 归一化为 main_ship_id = (ship_id//10)*10 + 1
 *   exclusive_dict: ship_id 字面值
 *
 * 数据实证：cfg_ship_peak_level 共 174 艘船，其中 85 艘是变体（30102/30103 等）。
 *   变体行 field[0] 恒为空（1700 行实测），COMMON 数据只存在基础舰行里。
 *   不归一化 → 变体舰的巅峰结构/移速加成全部丢失。
 *
 * @param shipId 5位舰船ID（可能是变体，如 30102）
 * @returns 基础舰 shipId（如 30101）；已是基础舰则原样返回
 */
function toMainShipId(shipId: string): string {
  const n = parseInt(shipId, 10);
  if (Number.isNaN(n)) return shipId;
  return String(Math.floor(n / 10) * 10 + 1);
}

/**
 * 查 cfg_ship_peak_level 获取指定舰船指定巅峰等级的快照。
 *
 * ★field[0](COMMON) 用基础舰查表（变体归一化）；field[1](EXCLUSIVE) 用字面 shipId。
 *
 * @param store 配置数据
 * @param shipId 5位舰船ID（可为变体）
 * @param peakLevel 巅峰等级(1-20),0 表示无巅峰
 * @returns 快照(无数据时返回 peakLevel=0 的空快照)
 */
export function getPeakSnapshot(
  store: ClientDataStore,
  shipId: string,
  peakLevel: number
): PeakSnapshot {
  if (peakLevel <= 0 || !store.shipPeakLevel) {
    return { peakLevel: 0, enhances: [], rewardEntries: [] };
  }
  // ★field[0] COMMON：用基础舰 shipId 查表（对齐 get_peak_effect 的 common 分支）
  const mainShipId = toMainShipId(shipId);
  const commonKey = mainShipId + String(peakLevel).padStart(2, '0');
  const commonRow = store.shipPeakLevel[commonKey];
  const enhanceStr = commonRow?.[0] ?? '';
  // ★field[1] EXCLUSIVE：用字面 shipId 查表（巅峰奖励是每变体独立的）
  const exclusiveKey = shipId + String(peakLevel).padStart(2, '0');
  const exclusiveRow = store.shipPeakLevel[exclusiveKey];
  const rewardStr = exclusiveRow?.[1] ?? '';

  if (!commonRow && !exclusiveRow) {
    return { peakLevel: 0, enhances: [], rewardEntries: [] };
  }
  return {
    peakLevel,
    enhances: parsePeakEnhanceString(enhanceStr),
    rewardEntries: parsePeakRewardString(rewardStr),
  };
}

/**
 * 从船级专属 effect 表查指定槽位 optIdx01 在指定等级的数值。
 *
 * key = slotId + "01"(如 603010101),取 EFFECT_PARAM_LEVEL 第 level 行。
 * 同时返回 EFFECT_ID 用于判断加成类型(12=结构/14=移速/16=曲率)。
 */
function lookupShipClassEffect(
  store: ClientDataStore,
  slotId: string,
  level: number
): { effect: RawSystemEffect; value: number } | null {
  const key = slotId + '01';
  const effect = store.systemEffect[key];
  if (!effect) return null;
  const paramLevel = effect.EFFECT_PARAM_LEVEL;
  if (!paramLevel) {
    // 无等级表,退回 EFFECT_PARAM
    return { effect, value: Number(effect.EFFECT_PARAM) ?? 0 };
  }
  const value = lookupParamLevel(paramLevel, level);
  if (value === null) return null;
  return { effect, value };
}

/** 解析 EFFECT_PARAM_LEVEL "1,200;2,400;..." 为 Map */
function parseParamLevel(paramLevel: string): Map<number, number> {
  const m = new Map<number, number>();
  for (const entry of paramLevel.split(';')) {
    const s = entry.trim();
    if (!s) continue;
    const [lv, val] = s.split(',').map(Number);
    if (!Number.isNaN(lv) && !Number.isNaN(val)) m.set(lv, val);
  }
  return m;
}

/** 从 PARAM_LEVEL 取指定 level 的值 */
function lookupParamLevel(paramLevel: string, level: number): number | null {
  return parseParamLevel(paramLevel).get(level) ?? null;
}

/**
 * 计算巅峰等级的数值加成(仅巅峰系统,字段0)。
 *
 * 对强化串里每个 {slotId, level}:
 *   - 查船级专属 effect 表 cfg_system_effect[slotId+"01"]
 *   - 取 EFFECT_PARAM_LEVEL 第 level 行
 *   - 按 EFFECT_ID 分发:12→结构绝对值,14→常规移速,16→曲率移速
 *
 * @param store 配置数据
 * @param shipId 5位舰船ID
 * @param peakLevel 巅峰等级
 * @returns 巅峰加成(结构绝对值 + 移速万分比)
 */
export function computePeakBonus(
  store: ClientDataStore,
  shipId: string,
  peakLevel: number
): PeakBonus {
  const result: PeakBonus = {
    structureAbsolute: 0,
    speedBonus: 0,
    curvatureSpeedBonus: 0,
    reward: { structurePermille: 0, damagePermille: 0, repairPermille: 0, details: [] },
    rewardEffectList: [],
    details: [],
  };
  if (peakLevel <= 0) return result;

  const snapshot = getPeakSnapshot(store, shipId, peakLevel);
  for (const entry of snapshot.enhances) {
    const lookup = lookupShipClassEffect(store, entry.slotId, entry.level);
    if (!lookup) continue;
    const effectId = Number(lookup.effect.EFFECT_ID);
    const name = String(lookup.effect.NAME ?? '');
    const detail = {
      slotId: entry.slotId,
      level: entry.level,
      effectId,
      name,
      value: lookup.value,
    };
    result.details.push(detail);

    // 按 EFFECT_ID 分发
    switch (effectId) {
      case 12: // 龙骨结构增强(绝对值,每级都有)
        result.structureAbsolute += lookup.value;
        break;
      case 14: // 引擎出力强化(常规移速,万分比)
        result.speedBonus += lookup.value;
        break;
      case 16: // 曲率引擎强化(曲率移速,万分比)
        result.curvatureSpeedBonus += lookup.value;
        break;
      default:
        // 其他 EFFECT_ID(暂未覆盖)记录在 details 里但不聚合
        break;
    }
  }

  // ★field[1]: 巅峰强化奖励(独立的巅峰专属强化项,optIdx=70/71)
  // 解析链: enhanceId -> systemEnhance[enhanceId].SYSTEM_EFFECT_PREFIX(=effect prefix)
  //         -> systemEffect[prefix+"01"] = 巅峰专属强化项 -> PARAM_LEVEL 第 level 行
  const systemEnhance = store.systemEnhance;
  const systemEffect = store.systemEffect;
  for (const entry of snapshot.rewardEntries) {
    if (entry.level <= 0) continue;
    const enhRec = systemEnhance?.[entry.enhanceId];
    if (!enhRec) continue;
    const prefix = Number(enhRec.SYSTEM_EFFECT_PREFIX);
    if (!prefix) continue;
    const effKey = String(prefix) + '01';
    const eff = systemEffect?.[effKey] as RawSystemEffect | undefined;
    if (!eff) continue;
    const effectId = Number(eff.EFFECT_ID ?? -1);
    const name = String(eff.NAME ?? '');
    // 取 PARAM_LEVEL 第 level 行(巅峰奖励强化项都是 A类,有等级表)
    const pl = eff.EFFECT_PARAM_LEVEL;
    if (!pl) continue;
    const value = lookupParamLevel(pl, entry.level);
    if (value == null) continue;

    result.reward.details.push({
      enhanceId: entry.enhanceId,
      level: entry.level,
      effectId,
      name,
      value,
    });

    // ★产出 EffectEntry（进统一表，getEnhanceAdd 按 weaponNumAttr 自动过滤）
    //   不再手写 switch 白名单——所有 reward EID 全收，不在表里的自然被过滤
    const e = eff as RawSystemEffect & { TARGET_INDEX?: number; TARGET_COMPANY?: number; TARGET_SHIP?: number };
    result.rewardEffectList.push({
      effectId, value,
      sourceSlotId: entry.enhanceId.slice(0, 7),
      targetShip: Number(e.TARGET_SHIP ?? 0),
      targetSystem: Number(e.TARGET_SYSTEM ?? 0),
      targetIndex: Number(e.TARGET_INDEX ?? 0),
      targetModuleType: Number(e.TARGET_MODULE_TYPE ?? 0),
      targetCompany: Number(e.TARGET_COMPANY ?? 0),
      isSystemEffect: true,
    });

    // 按 EFFECT_ID 分发到 reward 子结构（保留向后兼容）
    switch (effectId) {
      case 10: // 巅峰结构增强(万分比)
        result.reward.structurePermille += value;
        break;
      case 12350: // 巅峰武器单发(伤害,万分比)
        result.reward.damagePermille += value;
        break;
      case 12050: // 强化维修光束(维修效率,万分比)
        result.reward.repairPermille += value;
        break;
      default:
        // 其他类型(暴击12030等)记录在 details 但暂不聚合到具体字段
        break;
    }
  }

  return result;
}

/**
 * 根据累计经验判定可达巅峰等级。
 *
 * cfg_blueprint_peak_level: {"1":[1,10000], "2":[2,11000], ..., "19":[19,125000]}
 * 返回当前经验能达到的最高巅峰等级(满级20)。
 *
 * @param store 配置数据
 * @param totalExp 累计巅峰经验
 * @returns 巅峰等级(0-20)
 */
export function getPeakLevelByExp(store: ClientDataStore, totalExp: number): number {
  if (!store.blueprintPeakLevel || totalExp <= 0) return 0;
  let level = 0;
  for (const k in store.blueprintPeakLevel) {
    const row = store.blueprintPeakLevel[k];
    const reqLevel = Number(k);
    const reqExp = row?.[1] ?? 0;
    // 巅峰20经验需求=0(满级),跳过
    if (reqExp > 0 && totalExp >= reqExp && reqLevel > level) {
      level = reqLevel;
    }
  }
  return level;
}
