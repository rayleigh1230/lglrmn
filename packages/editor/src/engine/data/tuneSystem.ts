/**
 * 调校系统解析器 —— 对齐客户端 `common.blueprint_utils` 的 adjust 语义
 *
 * ★ 机制（反编译源码 + 配置数据双证，2026-07-08 全面对齐）：
 *
 * 调校是独立系统，与巅峰等级无必然关系。调校槽特征是有 ADJUST_PROB 字段（10级成功率）：
 *   - EFFECT_TYPE=2（走标准效果链）
 *   - ADJUST_PROB: 10级成功率 (100,100,100,90,80,70,60,50,25,15)
 *   - ADJUST_ENHANCE_INDEX: 被调校的目标 optIdx（1-13），指向**父强化项**
 *   - ADJUST_RARITY: 所需武器技术稀有度
 *   - SYSTEM_EFFECT_PREFIX: 调校**自身**效果前缀（查 system_effect 取数值，多用于 UI 显示）
 *
 * ★核心：调校的属性产出走"父强化 EFFECT_ID"通道（客户端 SYSTEM_ADJUST_IN_ENHANCE 路由）。
 *   客户端 `is_enhance_influence_effect_value(enhance_id)` 对调校做重定向：
 *     if enhance_id in SYSTEM_ADJUST_IN_ENHANCE:
 *         enhance_id = SYSTEM_ADJUST_IN_ENHANCE[enhance_id]   # adjust → 其父强化
 *   然后用**父强化的 EFFECT_ID** 查 SYSTEM_EFFECT_ENHANCE_DATA / calc_effect_add。
 *   即：调校不产生独立 EID 的属性贡献，而是通过父强化生效。
 *
 * ★数据实证（2254 个调校槽统计）：
 *   - 79% 调校自身 EFFECT_ID 与父强化相同（如结构 EID=10）—— 这些无论走自身/父都一致；
 *   - 8% 两者不同：调校自身是技能触发器（EID 13005 等，不在 cfg_weapon_num_attr），
 *     父强化才是真正影响属性的（如 EID 12141 缩短冷却与打击时间 = duration ratio_del）；
 *   - 59% 两者都是纯技能触发器（EID 都不在 weapon_num_attr，面板无属性贡献，正确归零）。
 *
 *   例：ST59 调校 603010140 自身 EID=13005（技能频率，PARAM=10000），
 *       其父 603010110 的 EID=12141（快速输出，PARAM=80，duration ratio_del）。
 *       调校 lv=N 提升父强化的有效产出 = 父PARAM × N / maxLevel(len ADJUST_PROB=10)。
 *
 * ★数值缩放（对齐 calc_effect_add 的 B 类公式）：
 *   effect_param = parent.PARAM × cur_level / max_level   (max_level = len(ADJUST_PROB))
 *   有 PARAM_LEVEL 时按等级查表（A 类）。
 *
 * 调校三步链：1.父强化(optIdx 01-11)点出  2.解锁调校槽  3.投入武器技术提调校等级。
 * optIdx=20 是系统维修机制槽（ENHANCE_COST=(0,)），不属于调校链。
 */
import type { ClientDataStore, RawSystemEffect } from './rawTypes';
import type { EffectEntry } from './effectList';

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
  /** 调校**自身**效果（从调校的 SYSTEM_EFFECT_PREFIX 查 system_effect；多用于 UI 显示） */
  effect?: {
    effectId: number;
    name: string;
    /** PARAM 值（万分比或绝对值，取决于 EFFECT_ID） */
    param: number;
  };
  /**
   * ★父强化的效果（属性产出走此通道，对齐 SYSTEM_ADJUST_IN_ENHANCE 路由）。
   * 由 targetEnhanceId 的 SYSTEM_EFFECT_PREFIX 查 system_effect 得到。
   * 客户端 is_enhance_influence_effect_value 把调校重定向到父强化，
   * calc_effect_add 实际用此 EFFECT_ID 查 cfg_weapon_num_attr 决定通道。
   */
  parentEffect?: {
    effectId: number;
    name: string;
    /** PARAM（无等级表时的满级值） */
    param: number;
    /** 等级表（A类查表用），格式 "1,v;2,v;..." */
    paramLevel?: string;
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
    const rec = enhance[enhanceId];
    // ★调校槽：有 ADJUST_PROB 字段（10级成功率）即为调校槽
    //   optIdx 不固定（主体在 31-43，但少量在 7/12/50/51，如白垩级 521010112 optIdx=12）
    //   不能靠 optIdx 范围识别，只能靠 ADJUST_PROB 特征字段
    const adjustProb = rec.ADJUST_PROB;
    if (!adjustProb || !Array.isArray(adjustProb)) continue;
    const optIdx = Number(enhanceId.slice(7, 9));

    const slotId = enhanceId.slice(0, 7);
    const effectPrefix = Number(rec.SYSTEM_EFFECT_PREFIX) || 0;
    const targetOptIdx = Number(rec.ADJUST_ENHANCE_INDEX) || 0;
    // ★目标强化项 enhanceId = shipId(5) + slot(2) + pad2(targetOptIdx)（同 slot scope）
    // 注意：调校槽的 slot 从 enhanceId 的第5-6位取，不能用 shipId 拼接（避免跨子系统混淆）
    const slotSuffix = enhanceId.slice(5, 7); // 2位 slot
    const targetEnhanceId = shipId + slotSuffix + String(targetOptIdx).padStart(2, '0');

    // 查调校**自身**效果（UI 显示用）
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

    // ★查父强化的效果（属性产出走此通道，对齐 SYSTEM_ADJUST_IN_ENHANCE）
    //   父 enhanceId = targetEnhanceId，其 SYSTEM_EFFECT_PREFIX 指向父 effect。
    let parentEffect: TuneSlot['parentEffect'];
    const parentRec = enhance[targetEnhanceId];
    if (parentRec && systemEffect) {
      const parentPrefix = Number(parentRec.SYSTEM_EFFECT_PREFIX) || 0;
      if (parentPrefix) {
        const pEffKey = String(parentPrefix) + '01';
        const pEff = systemEffect[pEffKey];
        if (pEff) {
          parentEffect = {
            effectId: Number(pEff.EFFECT_ID) || 0,
            name: String(pEff.NAME ?? ''),
            param: Number(pEff.EFFECT_PARAM) || 0,
            paramLevel: pEff.EFFECT_PARAM_LEVEL ? String(pEff.EFFECT_PARAM_LEVEL) : undefined,
          };
        }
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
      parentEffect,
    });
  }

  return { shipId, tuneSlots };
}

/**
 * 计算调校系统的面板加成。
 *
 * 调校等级由玩家投入武器技术决定（本次不模拟投入，只提供按等级计算的能力）。
 *
 * ★产出通道（对齐客户端 SYSTEM_ADJUST_IN_ENHANCE + calc_effect_add）：
 *   调校的属性产出走**父强化 EFFECT_ID** 通道。调校自身 EFFECT_ID（如 13005 技能频率）
 *   多为技能触发器，不在 cfg_weapon_num_attr → 走自身会归零。
 *   客户端 is_enhance_influence_effect_value 重定向到父强化，calc_effect_add 用父 EID 查表。
 *
 * @param store 配置数据
 * @param shipId 5位舰船ID
 * @param tuneLevels 调校槽等级映射 { enhanceId: level(0-10) }
 * @returns 调校加成聚合
 */
export interface TuneBonus {
  /** 结构值加成（万分比，来自父 EFFECT_ID=10 龙骨结构增强） */
  structureBonusPermille: number;
  /** 伤害加成（万分比，来自父 EFFECT_ID=12020 系统内武器伤害提升） */
  damageBonusPermille: number;
  /** 命中加成（万分比，来自父 EFFECT_ID=12010/12012 命中提升） */
  hitBonusPermille: number;
  /** 拦截率加成（来自父 EFFECT_ID=12080/12081/12083） */
  interceptRate: number;
  /** 维修效率加成（万分比，来自父 EFFECT_ID=12050） */
  repairBonusPermille: number;
  /** ★所有调校效果转 EffectEntry（用父 EID，进统一表，getEnhanceAdd 按 weaponNumAttr 自动过滤） */
  effectList: EffectEntry[];
  /** 生效的调校明细（effectId 为父 EID，value 为按调校等级缩放后的值） */
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
 * ★前提门控：调校生效需其目标强化项（targetEnhanceId / 父强化）已点出等级。
 *   传入 enhanceLevels（玩家已点的普通强化等级映射），调校 level>0 但父未点 → 计入 skipped[]。
 *   不传 enhanceLevels 时降级为不检查（向后兼容）。
 *
 * ★数值缩放（对齐 calc_effect_add B类公式：PARAM × cur_level / max_level）：
 *   max_level = len(ADJUST_PROB)（调校等级上限，TUNE_MAX_LEVEL=10）
 *   cur_level = tuneLevels[enhanceId]
 *   value = parent.PARAM × cur_level / max_level
 *   父有 PARAM_LEVEL 时按 cur_level 查表（A类）。
 *
 * ★EffectEntry 用父 EID（对齐 is_enhance_influence_effect_value 重定向）。
 *   父 EID 不在 weapon_num_attr 的（纯技能类）→ effectList 仍推入，由 getEnhanceAdd 自动过滤为 0（正确）。
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
    effectList: [],
    details: [],
    skipped: [],
  };
  const tuneSystem = resolveTuneSystem(store, shipId);

  for (const slot of tuneSystem.tuneSlots) {
    const level = tuneLevels[slot.enhanceId] ?? 0;
    // ★需父强化效果（属性产出通道）；调校自身 effect 仅供 UI，此处不用
    if (level <= 0 || !slot.parentEffect) continue;

    // ★前提门控：父强化（targetEnhanceId）需已点出等级
    if (enhanceLevels && (enhanceLevels[slot.targetEnhanceId] ?? 0) <= 0) {
      result.skipped.push({
        enhanceId: slot.enhanceId,
        targetEnhanceId: slot.targetEnhanceId,
        reason: `目标强化项 ${slot.targetEnhanceId} 未点出等级`,
      });
      continue;
    }

    // 数值缩放：对齐 calc_effect_add（A类查表 / B类 PARAM×lv/maxLv）
    const maxLevel = slot.adjustProb.length || TUNE_MAX_LEVEL;
    let value: number;
    if (slot.parentEffect.paramLevel) {
      value = lookupParamLevel(slot.parentEffect.paramLevel, level); // A类查表
    } else {
      value = (slot.parentEffect.param * level) / maxLevel;          // B类线性缩放
    }

    const parentEffectId = slot.parentEffect.effectId;
    result.details.push({
      enhanceId: slot.enhanceId,
      level,
      effectId: parentEffectId,
      name: slot.parentEffect.name,
      value,
    });

    // ★产出 EffectEntry：用父 EID（对齐 SYSTEM_ADJUST_IN_ENHANCE 重定向）。
    //   父强化的 TARGET_* 字段从父 effect 记录取。
    const parentRec = store.systemEnhance?.[slot.targetEnhanceId];
    const parentPrefix = Number(parentRec?.SYSTEM_EFFECT_PREFIX) || 0;
    const pEffRec = parentPrefix ? store.systemEffect?.[String(parentPrefix) + '01'] : undefined;
    if (pEffRec) {
      const e = pEffRec as RawSystemEffect & { TARGET_INDEX?: number; TARGET_COMPANY?: number; TARGET_SHIP?: number };
      result.effectList.push({
        effectId: parentEffectId, value,
        sourceSlotId: slot.slotId,
        targetShip: Number(e.TARGET_SHIP ?? 0),
        targetSystem: Number(e.TARGET_SYSTEM ?? 0),
        targetIndex: Number(e.TARGET_INDEX ?? 0),
        targetModuleType: Number(e.TARGET_MODULE_TYPE ?? 0),
        targetCompany: Number(e.TARGET_COMPANY ?? 0),
        isSystemEffect: true,
      });
    }

    // 按**父** EFFECT_ID 分发聚合（向后兼容字段）
    switch (parentEffectId) {
      case 10: // 龙骨结构增强（结构万分比）
        result.structureBonusPermille += value;
        break;
      case 12020: // 系统内武器伤害提升（伤害万分比）
        result.damageBonusPermille += value;
        break;
      case 12010: // 通用命中提升
      case 12012: // 对舰/对空命中提升
        result.hitBonusPermille += value;
        break;
      case 12080: // 获得拦截能力
      case 12081: // 提升拦截率
      case 12083: // 导弹拦截子系统
        result.interceptRate += value;
        break;
      case 12050: // 强化维修光束（维修效率）
        result.repairBonusPermille += value;
        break;
      default:
        // 其他 EFFECT_ID（含 12141 缩短冷却等）透明记录在 details，不聚合到旧字段
        // —— 这些通过 effectList 进入统一通道，由 effectList.ts 按 weapon_num_attr 处理
        break;
    }
  }

  return result;
}

/** 解析 EFFECT_PARAM_LEVEL "1,200;2,400;..." 并取指定 level 的值（与 peakLevel 共享语义） */
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

function lookupParamLevel(paramLevel: string, level: number): number {
  return parseParamLevel(paramLevel).get(level) ?? 0;
}

/**
 * 判断一个 enhanceId 是否为调校槽（启发式，按 optIdx 粗判）。
 * ★注意：调校槽的精确识别应优先用 resolveTuneSystem（按 ADJUST_PROB 字段）。
 *   本函数仅靠 enhanceId 字符串，无法访问字段，对范围外调校槽（optIdx=7/12/50/51）
 *   会漏判。当前无调用方，保留供未来按 optIdx 粗筛场景使用。
 */
export function isTuneSlot(enhanceId: string): boolean {
  const optIdx = Number(enhanceId.slice(7, 9));
  // 主体在 31-43，少量在 7/12/50/51（数据实证，见 resolveTuneSystem 注释）
  return (optIdx >= 31 && optIdx <= 43) || optIdx === 7 || optIdx === 12 || optIdx === 50 || optIdx === 51;
}
