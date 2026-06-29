/**
 * 命中判定阶段（docs §3）
 *
 * 公式（来源：WIKI《武器命中率与拦截率计算公式》）：
 *   对舰实际命中率 = 基础命中率 × (1 + 强化命中加成 − 对方闪避率 − 命中减益)
 *
 * 命中率极限：最低 10%，最高 95%（不存在 0% 和 100%）。
 *
 * 本阶段是纯函数：给定武器、目标、随机数 → 是否命中。
 */
import type { Ship, WeaponSystem, RNG } from '../types/index.js';

/** 命中率计算的中间结果，便于测试断言 */
export interface HitCalc {
  /** 该武器对该目标的基础命中率（查表，0~1） */
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
 * 计算武器对目标的最终命中率（不含随机判定）。
 * 公式：base × (1 + bonus − dodge)，再夹到 [10%, 95%]。
 *
 * 注：基础命中率按目标 class 查表，查不到则用默认 0.5。
 * 命中减益（如阋神星"火力倾泻"自降命中）属策略层，MVP-2 再接入。
 */
export function computeHitRate(weapon: WeaponSystem, target: Ship): number {
  const base = weapon.baseHit[target.class] ?? 0.5;
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
 * roll < final ⇒ 命中。
 */
export function hitCheck(weapon: WeaponSystem, target: Ship, rng: RNG): HitCalc {
  const base = weapon.baseHit[target.class] ?? 0.5;
  const bonus = weapon.hitBonus ?? 0;
  const dodge = target.dodge;
  const final = computeHitRate(weapon, target);
  const roll = rng.next();
  const hit = roll < final;
  return { base, bonus, dodge, final, hit, roll };
}
