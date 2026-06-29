/**
 * 命中判定阶段（docs §3）
 *
 * 公式（来源：WIKI《武器命中率与拦截率计算公式》）：
 *   对舰实际命中率 = 基础命中率 × (1 + 强化命中加成 − 对方闪避率 − 命中减益)
 *
 * 命中率极限：最低 10%，最高 95%（不存在 0% 和 100%）。
 *
 * 基础命中率可以是**单值**（已标定的精确值）或**区间**（游戏面板给的 50%-70%）。
 * 区间模式下，每发开火在 [min,max] 内独立 roll 一次 base 值，再套公式做命中判定。
 * 单值 0.8 等价于区间 {min:0.8,max:0.8}。
 *
 * 本阶段是纯函数：给定武器、目标、随机数 → 是否命中。
 */
import type { Ship, WeaponSystem, RNG, HitRate } from '../types/index.js';

/** 命中率计算的中间结果，便于测试断言 */
export interface HitCalc {
  /** 该武器对该目标的基础命中率（查表，0~1）。区间模式下为本发 roll 出的值 */
  base: number;
  /** 命中加成（蓝图强化等） */
  bonus: number;
  /** 目标闪避率 */
  dodge: number;
  /** 最终命中率（已夹在 10%~95%） */
  final: number;
  /** 是否命中 */
  hit: boolean;
  /** 命中判定时所用的随机数 */
  roll: number;
}

/** 命中率极限 */
export const HIT_RATE_MIN = 0.1;
export const HIT_RATE_MAX = 0.95;

/**
 * 从命中率取值中解析出"基准 base"：
 *   - 单值 → 直接返回（不消耗 RNG）
 *   - 区间 → 在 [min,max] 内 roll 一个值（消耗 1 次 RNG）
 *
 * 区间模式对应游戏面板的命中率区间（如 50%-70%）：每发独立取值。
 */
export function rollBaseHit(hit: HitRate | undefined, rng: RNG): number {
  if (hit === undefined) return 0.5; // 查表不到的默认值
  if (typeof hit === 'number') return hit;
  // 区间：min + r × (max − min)
  return hit.min + rng.next() * (hit.max - hit.min);
}

/** 取命中率取值的"中值"（区间取 (min+max)/2），用于纯函数估算，不消耗 RNG */
export function baseHitMid(hit: HitRate | undefined): number {
  if (hit === undefined) return 0.5;
  if (typeof hit === 'number') return hit;
  return (hit.min + hit.max) / 2;
}

/**
 * 计算武器对目标的最终命中率（不含随机判定）。
 * 公式：base × (1 + bonus − dodge)，再夹到 [10%, 95%]。
 *
 * 注：基础命中率按目标 class 查表，查不到则用默认 0.5。
 *     区间模式下用**中值**估算（确定性），仅用于纯函数场景；
 *     实际每发命中判定见 hitCheck（在区间内 roll）。
 * 命中减益（如阋神星"火力倾泻"自降命中）属策略层，MVP-2 再接入。
 */
export function computeHitRate(weapon: WeaponSystem, target: Ship): number {
  const base = baseHitMid(weapon.baseHit[target.class]);
  const bonus = weapon.hitBonus ?? 0;
  const dodge = target.dodge;
  const raw = base * (1 + bonus - dodge);
  return clampHitRate(raw);
}

/** 把任意命中率夹到合法区间 [10%, 95%] */
export function clampHitRate(rate: number): number {
  if (rate < HIT_RATE_MIN) return HIT_RATE_MIN;
  if (rate > HIT_RATE_MAX) return HIT_RATE_MAX;
  return rate;
}

/**
 * 命中判定（含随机 roll）。
 *
 * RNG 消耗顺序：
 *   - 区间 base：先取 1 次 RNG roll 出本发 base（仅区间模式）
 *   - 命中判定：再取 1 次 RNG 与 final 比较
 * 单值 base 不消耗 RNG（确定性），保持向后兼容。
 *
 * roll < final ⇒ 命中。
 */
export function hitCheck(weapon: WeaponSystem, target: Ship, rng: RNG): HitCalc {
  const bonus = weapon.hitBonus ?? 0;
  const dodge = target.dodge;
  // 区间模式 roll base，单值模式直接取
  const base = rollBaseHit(weapon.baseHit[target.class], rng);
  const raw = base * (1 + bonus - dodge);
  const final = clampHitRate(raw);
  const roll = rng.next();
  const hit = roll < final;
  return { base, bonus, dodge, final, hit, roll };
}
