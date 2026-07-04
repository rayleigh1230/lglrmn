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
  /** 被调校的目标强化项 optIdx（ADJUST_ENHANCE_INDEX，1-13） */
  targetOptIdx: number;
  /** ★目标强化项完整9位 enhanceId（= shipId+slot+pad2(targetOptIdx)，同 slot scope） */
  targetEnhanceId: string;
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
    const targetOptIdx = Number(rec.ADJUST_ENHANCE_INDEX) || 0;
    // ★目标强化项 enhanceId = shipId(5) + slot(2) + pad2(targetOptIdx)（同 slot scope）
    // 注意：调校槽的 slot 从 enhanceId 的第5-6位取，不能用 shipId 拼接（避免跨子系统混淆）
    const slotSuffix = enhanceId.slice(5, 7); // 2位 slot
    const targetEnhanceId = shipId + slotSuffix + String(targetOptIdx).padStart(2, '0');

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
      targetOptIdx,
      targetEnhanceId,
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
  /** 结构值加成（万分比，来自 EFFECT_ID=10 龙骨结构增强） */
  structureBonusPermille: number;
  /** 伤害加成（万分比，来自 EFFECT_ID=13005 优势输出） */
  damageBonusPermille: number;
  /** 命中加成（万分比，来自 EFFECT_ID=12010/12014） */
  hitBonusPermille: number;
  /** 拦截率加成（来自 EFFECT_ID=12080/12081/12083） */
  interceptRate: number;
  /** 维修效率加成（万分比，来自 EFFECT_ID=12050） */
  repairBonusPermille: number;
  /** 生效的调校明细 */
  details: Array<{
    enhanceId: string;
    level: number;
    effectId: number;
    name: string;
    value: number;
  }>;
  /** ★因目标强化项未点出而被门控跳过的调校（前提未满足） */
  skipped: Array<{
    enhanceId: string;
    targetEnhanceId: string;
    reason: string;
  }>;
}

/**
 * 计算调校系统的面板加成。
 *
 * ★前提门控：调校生效需其目标强化项（targetEnhanceId）已点出等级。
 *   传入 enhanceLevels（玩家已点的普通强化等级映射），调校 level>0 但目标未点 → 计入 skipped[]。
 *   不传 enhanceLevels 时降级为不检查（向后兼容）。
 *
 * ★效果聚合：调校应用自己的独立效果（不同 EFFECT_ID），按 EFFECT_ID 分发：
 *   EID=10 → structureBonusPermille（万分比 × level/maxLevel）
 *   EID=13005 → damageBonusPermille
 *   EID=12010/12014 → hitBonusPermille
 *   EID=12080/12081/12083 → interceptRate
 *   EID=12050 → repairBonusPermille
 *   其他 → details 透明记录
 *
 * @param store 配置数据
 * @param shipId 5位舰船ID
 * @param tuneLevels 调校槽等级映射 { enhanceId: level(0-10) }
 * @param enhanceLevels 可选，玩家已点的普通强化等级映射（用于前提门控）
 */
export function computeTuneBonus(
  store: ClientDataStore,
  shipId: string,
  tuneLevels: Record<string, number>,
  enhanceLevels?: Record<string, number>
): TuneBonus {
  const result: TuneBonus = {
    structureBonusPermille: 0,
    damageBonusPermille: 0,
    hitBonusPermille: 0,
    interceptRate: 0,
    repairBonusPermille: 0,
    details: [],
    skipped: [],
  };
  const tuneSystem = resolveTuneSystem(store, shipId);

  for (const slot of tuneSystem.tuneSlots) {
    const level = tuneLevels[slot.enhanceId] ?? 0;
    if (level <= 0 || !slot.effect) continue;

    // ★前提门控：目标强化项需已点出等级
    if (enhanceLevels && (enhanceLevels[slot.targetEnhanceId] ?? 0) <= 0) {
      result.skipped.push({
        enhanceId: slot.enhanceId,
        targetEnhanceId: slot.targetEnhanceId,
        reason: `目标强化项 ${slot.targetEnhanceId} 未点出等级`,
      });
      continue;
    }

    // 数值缩放：PARAM × level / maxLevel（万分比类线性缩放）
    const value = (slot.effect.param * level) / TUNE_MAX_LEVEL;

    result.details.push({
      enhanceId: slot.enhanceId,
      level,
      effectId: slot.effect.effectId,
      name: slot.effect.name,
      value,
    });

    // 按 EFFECT_ID 分发聚合
    switch (slot.effect.effectId) {
      case 10: // 龙骨结构增强（万分比）
        result.structureBonusPermille += value;
        break;
      case 13005: // 优势输出（伤害，万分比）
        result.damageBonusPermille += value;
        break;
      case 12010: // 通用命中提升（万分比）
      case 12014: // 精密射击（万分比）
        result.hitBonusPermille += value;
        break;
      case 12080: // 获得拦截能力
      case 12081: // 提升拦截率
      case 12083: // 导弹拦截子系统
        result.interceptRate += value;
        break;
      case 12050: // 强化维修光束（维修效率，万分比）
        result.repairBonusPermille += value;
        break;
      default:
        // 其他 EFFECT_ID 透明记录在 details，不聚合
        break;
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
