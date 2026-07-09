/**
 * 暴击判定阶段（docs §4）
 *
 * 游戏中没有"基础暴击率"——所有暴击率都来自武器/蓝图/词条的明确数值。
 * 武器未指定 critRate 时，暴击率 = 0（不会暴击）。
 * 暴击伤害倍率默认 2.0（造成 200% 伤害），可被特殊词条/策略提升。
 *
 * 本阶段是纯函数：给定武器、随机数 → 是否暴击。
 */
import type { WeaponSystem, RNG } from '../types/index';

export interface CritCalc {
  /** 暴击率 */
  rate: number;
  /** 是否暴击 */
  crit: boolean;
  /** 判定所用随机数 */
  roll: number;
}

/** 暴击判定：未指定 critRate 则暴击率为 0 */
export function critCheck(weapon: WeaponSystem, rng: RNG): CritCalc {
  const rate = weapon.critRate ?? 0;
  const roll = rng.next();
  const crit = roll < rate;
  return { rate, crit, roll };
}
