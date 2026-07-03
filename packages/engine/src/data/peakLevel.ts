/**
 * 巅峰等级系统解析器
 *
 * ★ 机制说明(2026-07-03 经 ST59/FG300 实测确认):
 *
 * cfg_ship_peak_level.json 的 key = shipId(5) + peakLv(2),如 6030116 = ST59 巅峰16级。
 * value = [强化串(字段0), 调校解锁串(字段1)]。
 *
 * 字段0(强化串,巅峰系统)格式: "slotId,level;slotId,level;..."
 *   - slotId = 7位(shipId5 + slot2),如 6030101
 *   - level = 该槽 optIdx01 的强化等级(巅峰抬升上限:普通4 → 巅峰20)
 *   - 槽01 = 龙骨结构增强(EFFECT_ID=12,绝对值),每级都有
 *   - 槽02 = 引擎出力(EFFECT_ID=14,常规移速%),特定巅峰等级才升级
 *   - 槽03 = 曲率引擎(EFFECT_ID=16,曲率移速%),特定巅峰等级才升级
 *
 * ★ 数值来源:查船级专属 effect 表 cfg_system_effect[slotId + "01"].EFFECT_PARAM_LEVEL 第 level 行。
 *   该表本身覆盖 1-30 级(如 ST59 龙骨 603010101: lv1=2190, lv16=52680, lv20=66905)。
 *   普通玩家受 ENHANCE_COST 长度限制只能升到4级,巅峰把它抬到20级,读取表中本就存在的行。
 *
 * 字段1(调校解锁串,调校系统): "slotId70,level;..." —— 属于独立的调校系统,
 *   与巅峰等级无必然关系,本次不实装(见 parseTuneString 占位)。
 *
 * 巅峰等级判定:cfg_blueprint_peak_level.json 给出 1-19 级的累计经验阈值
 *   (如 巅峰5=20000, 巅峰16=90000)。等级靠道具开启+任务经验提升。
 */
import type { ClientDataStore, RawSystemEffect } from './rawTypes.js';

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
  /** 强化串解析结果(字段0,巅峰系统) */
  enhances: PeakEnhanceEntry[];
  /** 原始调校解锁串(字段1,调校系统,本次不解析) */
  tuneStringRaw: string;
}

/** 巅峰强化数值(按 EFFECT_ID 分发后的聚合结果) */
export interface PeakBonus {
  /** 结构加成绝对值(EFFECT_ID=12,龙骨结构增强,每级都有) */
  structureAbsolute: number;
  /** 常规移速加成万分比(EFFECT_ID=14,引擎出力) */
  speedBonus: number;
  /** 曲率移速加成万分比(EFFECT_ID=16,曲率引擎) */
  curvatureSpeedBonus: number;
  /** 实际解析到的加成明细(调试用) */
  details: Array<{ slotId: string; level: number; effectId: number; name: string; value: number }>;
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
 * 调校解锁串解析(字段1,占位) —— 调校系统已独立实装,见 tuneSystem.ts。
 *
 * 字段1格式: "slotId70,level;..."(70号槽,随巅峰等级到3级)。
 * 真正的调校系统(optIdx=31-43, 10级)在 cfg_system_enhance 里,
 * 由 resolveTuneSystem() 解析,不走此函数。
 *
 * 70号槽是巅峰附带的少量调校(EFFECT_TYPE=3/5),与主调校系统不同。
 */
export function parseTuneString(_str: string): PeakEnhanceEntry[] {
  void _str;
  return [];
}

/**
 * 查 cfg_ship_peak_level 获取指定舰船指定巅峰等级的快照。
 *
 * @param store 配置数据
 * @param shipId 5位舰船ID
 * @param peakLevel 巅峰等级(1-20),0 表示无巅峰
 * @returns 快照(无数据时返回 peakLevel=0 的空快照)
 */
export function getPeakSnapshot(
  store: ClientDataStore,
  shipId: string,
  peakLevel: number
): PeakSnapshot {
  if (peakLevel <= 0 || !store.shipPeakLevel) {
    return { peakLevel: 0, enhances: [], tuneStringRaw: '' };
  }
  // key = shipId(5) + peakLv(补零2位)
  const key = shipId + String(peakLevel).padStart(2, '0');
  const row = store.shipPeakLevel[key];
  if (!row) {
    return { peakLevel: 0, enhances: [], tuneStringRaw: '' };
  }
  const enhanceStr = row[0] ?? '';
  const tuneStr = row[1] ?? '';
  return {
    peakLevel,
    enhances: parsePeakEnhanceString(enhanceStr),
    tuneStringRaw: tuneStr,
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
