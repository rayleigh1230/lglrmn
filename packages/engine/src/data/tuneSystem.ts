/**
 * 调校系统解析器
 *
 * ★ 机制（2026-07-03 从游戏运行时 frida dump 确认）：
 *
 * 调校是独立系统，与巅峰等级无必然关系。
 * 调校槽在 cfg_system_enhance 里，optIdx=31-43，特征：
 *   - EFFECT_TYPE=2（走标准效果链）
 *   - ADJUST_PROB: 10级成功率 (100,100,100,90,80,70,60,50,25,15)
 *   - ADJUST_ENHANCE_INDEX: 被调校的目标 optIdx（1-10）
 *   - ADJUST_RARITY: 所需武器技术稀有度
 *   - SYSTEM_EFFECT_PREFIX: 调校效果前缀（查 system_effect 取数值）
 *
 * 调校三步链（用户描述 + 数据印证）：
 *   1. 普通强化项（optIdx 01-11）点过等级
 *   2. 解锁对应的调校槽（optIdx 31-43，ADJUST_ENHANCE_INDEX 指向被调校项）
 *   3. 投入武器技术提升调校等级（最多10级，成功率递减）
 *
 * 调校效果类型（从 PREFIX 查 system_effect）：
 *   - EFFECT_ID=10 龙骨结构增强（结构值，PARAM=万分比）
 *   - EFFECT_ID=13005 优势输出（伤害类）
 *   - EFFECT_ID=12014 精密射击（命中/精度类）
 *
 * optIdx=20 是系统维修机制槽（ENHANCE_COST=(0,)），不属于调校链。
 */
import type { ClientDataStore } from './rawTypes.js';

/** 调校槽解析结果 */
export interface TuneSlot {
  /** 9位 enhanceId（如 405010138） */
  enhanceId: string;
  /** 7位 slotId */
  slotId: string;
  /** optIdx（31-43） */
  optIdx: number;
  /** 被调校的目标强化项 optIdx（ADJUST_ENHANCE_INDEX，1-10） */
  targetOptIdx: number;
  /** 调校效果前缀（SYSTEM_EFFECT_PREFIX） */
  effectPrefix: number;
  /** 调校各级成功率（10级） */
  adjustProb: number[];
  /** 所需武器技术稀有度 */
  rarity: number;
  /** 调校效果（从 system_effect 查得） */
  effect?: {
    effectId: number;
    name: string;
    /** PARAM 值（万分比或绝对值，取决于 EFFECT_ID） */
    param: number;
  };
}

/** 舰船调校系统解析结果 */
export interface ShipTuneSystem {
  shipId: string;
  /** 所有调校槽（optIdx=31-43） */
  tuneSlots: TuneSlot[];
}

/** 调校槽数量上限（10级） */
export const TUNE_MAX_LEVEL = 10;

/**
 * 解析指定舰船的调校系统。
 *
 * 遍历 cfg_system_enhance 里以 shipId 开头、optIdx=31-43 且有 ADJUST_PROB 的记录。
 *
 * @param store 配置数据
 * @param shipId 5位舰船ID
 * @returns 调校系统解析结果
 */
export function resolveTuneSystem(store: ClientDataStore, shipId: string): ShipTuneSystem {
  const enhance = store.systemEnhance;
  const systemEffect = store.systemEffect;
  const tuneSlots: TuneSlot[] = [];

  if (!enhance) return { shipId, tuneSlots };

  for (const enhanceId in enhance) {
    if (!enhanceId.startsWith(shipId)) continue;
    const optIdx = Number(enhanceId.slice(7, 9));
    // 调校槽：optIdx=31-43 且有 ADJUST_PROB 字段
    if (optIdx < 31 || optIdx > 43) continue;
    const rec = enhance[enhanceId];
    const adjustProb = rec.ADJUST_PROB;
    if (!adjustProb || !Array.isArray(adjustProb)) continue;

    const slotId = enhanceId.slice(0, 7);
    const effectPrefix = Number(rec.SYSTEM_EFFECT_PREFIX) || 0;

    // 查调校效果
    let effect: TuneSlot['effect'];
    if (effectPrefix && systemEffect) {
      const effKey = String(effectPrefix) + '01';
      const eff = systemEffect[effKey];
      if (eff) {
        effect = {
          effectId: Number(eff.EFFECT_ID) || 0,
          name: String(eff.NAME ?? ''),
          param: Number(eff.EFFECT_PARAM) || 0,
        };
      }
    }

    tuneSlots.push({
      enhanceId,
      slotId,
      optIdx,
      targetOptIdx: Number(rec.ADJUST_ENHANCE_INDEX) || 0,
      effectPrefix,
      adjustProb: adjustProb as number[],
      rarity: Number(rec.ADJUST_RARITY) || 0,
      effect,
    });
  }

  return { shipId, tuneSlots };
}

/**
 * 计算调校系统的面板加成。
 *
 * 调校等级由玩家投入武器技术决定（本次不模拟投入，只提供按等级计算的能力）。
 * 给定每个调校槽的等级后，按 EFFECT_ID 聚合加成：
 *   - EFFECT_ID=10（龙骨结构增强）→ 结构值万分比
 *   - EFFECT_ID=13005（优势输出）→ 伤害类
 *   - 其他 EFFECT_ID → 透明记录
 *
 * @param store 配置数据
 * @param shipId 5位舰船ID
 * @param tuneLevels 调校槽等级映射 { enhanceId: level(0-10) }
 * @returns 调校加成聚合
 */
export interface TuneBonus {
  /** 结构值加成（万分比，来自 EFFECT_ID=10） */
  structureBonusPermille: number;
  /** 所有调校槽的明细 */
  details: Array<{
    enhanceId: string;
    level: number;
    effectId: number;
    name: string;
    param: number;
  }>;
}

export function computeTuneBonus(
  store: ClientDataStore,
  shipId: string,
  tuneLevels: Record<string, number>
): TuneBonus {
  const result: TuneBonus = { structureBonusPermille: 0, details: [] };
  const tuneSystem = resolveTuneSystem(store, shipId);

  for (const slot of tuneSystem.tuneSlots) {
    const level = tuneLevels[slot.enhanceId] ?? 0;
    if (level <= 0 || !slot.effect) continue;

    const detail = {
      enhanceId: slot.enhanceId,
      level,
      effectId: slot.effect.effectId,
      name: slot.effect.name,
      param: slot.effect.param,
    };
    result.details.push(detail);

    // 按 EFFECT_ID 聚合
    if (slot.effect.effectId === 10) {
      // 龙骨结构增强：PARAM 是万分比，按等级线性缩放
      // （调校的数值机制可能用 PARAM_LEVEL，暂用 PARAM × level/maxLevel 近似）
      result.structureBonusPermille += slot.effect.param * level / TUNE_MAX_LEVEL;
    }
  }

  return result;
}

/**
 * 判断一个 enhanceId 是否为调校槽。
 * 用于 resolver 区分普通强化和调校强化。
 */
export function isTuneSlot(enhanceId: string): boolean {
  const optIdx = Number(enhanceId.slice(7, 9));
  return optIdx >= 31 && optIdx <= 43;
}
