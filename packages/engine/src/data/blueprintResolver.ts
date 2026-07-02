/**
 * 蓝图解析器（核心）—— 把战报科技串解析成强化效果，并计算出强化后的数值。
 *
 * 解析链路（docs/11 §2.2，已由 CV3000 +33% HP 铁证验证）：
 *   战报科技串三元组 (subType, techId, level)
 *     → techId + level 拼 key 查 cfg_system_effect
 *     → 取 EFFECT_ID + 数值
 *     → 按 EFFECT_ID 分类聚合
 *
 * EFFECT_ID → 引擎属性 的转译用 switch 实现，里程碑1只实现 EFFECT_ID=10（结构强化），
 * 其他 EFFECT_ID 落到 unresolved[] 透明记录，不报错。后续里程碑逐个填充 case。
 */
import type { ClientDataStore, RawSystemEffect } from './rawTypes.js';
import { SHIP } from './rawTypes.js';
import { parseTechString, type TechModule } from './techString.js';

/** 万分比基数（PARAM / PERMILLE = 百分比）。来自 CV3000 验证：3300/10000=33% */
const PERMILLE = 10000;

/** 一个解析后的效果（已取出 EFFECT_ID 与数值） */
export interface ResolvedEffect {
  /** 来源科技模块（便于追溯） */
  tech: TechModule;
  /** 效果类型 ID（决定机制） */
  effectId: number;
  /** 效果名（中文，来自 system_effect.NAME） */
  name: string;
  /** 数值（已按 level 解析，单位取决于机制） */
  value: number;
  /** 数值来源：direct=直接条目 / param_level=等级表 / base_param=基础条目 */
  source: 'direct' | 'param_level' | 'base_param';
}

/** 未实现的效果（EFFECT_ID 无对应 case），透明记录便于后续扩展 */
export interface UnresolvedEffect {
  tech: TechModule;
  effectId: number;
  name: string;
  /** 未实现原因 */
  reason: string;
}

/** 蓝图解析结果 */
export interface ResolvedBlueprint {
  shipId: string;
  /** 基础结构值（cfg_ship[4]，未含强化） */
  baseStructure: number;
  /** 强化后结构值（里程碑1的核心输出） */
  finalStructure: number;
  /** 全部解析出的效果（含已实现与未实现） */
  effects: ResolvedEffect[];
  /** 未实现的 EFFECT（透明记录） */
  unresolved: UnresolvedEffect[];
}

/** EFFECT 查找的三步规则（docs/11 §2.2 Step2-3） */
interface EffectLookup {
  effect: RawSystemEffect;
  value: number;
  source: 'direct' | 'param_level' | 'base_param';
}

/**
 * 按 techId + level 查找 system_effect，取出数值。
 *
 * 三步规则（已验证）：
 *   1. direct：techId + level补零2位 直接命中（如 8890+01=889001）→ 值=EFFECT_PARAM
 *   2. param_level：techId + '01' 命中基础条目，且有 EFFECT_PARAM_LEVEL → 按 level 查表
 *   3. base_param：techId + '01' 命中基础条目，无 PARAM_LEVEL → 值=EFFECT_PARAM
 *
 * 例：
 *   8890@1 → direct 889001，EFFECT_PARAM=500
 *   1132@5 → param_level 113201，PARAM_LEVEL[5]=1400
 *   1210@5 → base_param 121001，EFFECT_PARAM=75
 */
function lookupEffect(
  store: ClientDataStore,
  techId: number,
  level: number
): EffectLookup | null {
  const { systemEffect } = store;
  const prefix = String(techId);

  // 1. direct：尝试 PREFIX + level补零2位
  const directKey = prefix + String(level).padStart(2, '0');
  const direct = systemEffect[directKey];
  if (direct) {
    return { effect: direct, value: direct.EFFECT_PARAM ?? 0, source: 'direct' };
  }

  // 2/3. 用基础条目 PREFIX + '01'
  const baseKey = prefix + '01';
  const base = systemEffect[baseKey];
  if (!base) return null;

  // 2. param_level：有等级表则按 level 查
  if (base.EFFECT_PARAM_LEVEL) {
    const value = lookupParamLevel(base.EFFECT_PARAM_LEVEL, level);
    return { effect: base, value, source: 'param_level' };
  }

  // 3. base_param：无等级表，用基础 EFFECT_PARAM
  return { effect: base, value: base.EFFECT_PARAM ?? 0, source: 'base_param' };
}

/** 解析 EFFECT_PARAM_LEVEL 等级表 "1,200;2,500;3,800;..." 取指定 level 的值 */
function lookupParamLevel(paramLevel: string, level: number): number {
  const entries = paramLevel.split(';').filter((s) => s.trim().length > 0);
  for (const entry of entries) {
    const [lv, val] = entry.split(',').map(Number);
    if (lv === level) return val ?? 0;
  }
  return 0;
}

/**
 * 解析蓝图：科技串 → 强化效果 → 强化后数值。
 *
 * @param store 配置表存储
 * @param shipId 舰船 ID（5位，如 "80201"=CV3000）
 * @param techStr 战报科技串
 * @returns 蓝图解析结果（含 finalStructure）
 */
export function resolveBlueprint(
  store: ClientDataStore,
  shipId: string,
  techStr: string
): ResolvedBlueprint {
  const modules = parseTechString(techStr);
  const effects: ResolvedEffect[] = [];
  const unresolved: UnresolvedEffect[] = [];

  // 基础结构值
  const shipRow = store.ship[shipId];
  const baseStructure = shipRow ? shipRow[SHIP.STRUCTURE] : 0;

  // 结构强化万分比累加（EFFECT_ID=10）
  let structBonusPermille = 0;

  for (const tech of modules) {
    const lookup = lookupEffect(store, tech.techId, tech.level);
    if (!lookup) {
      unresolved.push({
        tech,
        effectId: -1,
        name: '(system_effect 未找到)',
        reason: `techId=${tech.techId} 在 system_effect 中无记录`,
      });
      continue;
    }

    const effectId = lookup.effect.EFFECT_ID ?? -1;
    const resolved: ResolvedEffect = {
      tech,
      effectId,
      name: lookup.effect.NAME ?? '(无名)',
      value: lookup.value,
      source: lookup.source,
    };

    // 按 EFFECT_ID 分发（里程碑1只实现结构强化）
    switch (effectId) {
      case 10: // 舰船结构值提高（万分比加法叠加）
        structBonusPermille += lookup.value;
        effects.push(resolved);
        break;
      default:
        // 未实现的 EFFECT：透明记录，不报错
        unresolved.push({
          tech,
          effectId,
          name: resolved.name,
          reason: `EFFECT_ID=${effectId} 暂未实现转译`,
        });
        break;
    }
  }

  // 结构值计算：base × (1 + Σ万分比 / 10000)
  const finalStructure = Math.round(baseStructure * (1 + structBonusPermille / PERMILLE));

  return {
    shipId,
    baseStructure,
    finalStructure,
    effects,
    unresolved,
  };
}
