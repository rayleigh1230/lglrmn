/**
 * 命中判定阶段（docs §3）
 *
 * 公式（实测校准，2026-06，来源：三组对FG300的实测反推）：
 *   final = base × (1 + hitBonus + 对舰种命中k − 通用闪避d − 武器类别闪避dW)
 *   再夹到 [10%, 95%]。
 *
 * 三轮实验结论（详见 tests/weapon-dodge.ts、tests/shipclass-hitbonus.ts）：
 *   1. 通用闪避 d：加法进 −槽（既有）
 *   2. "被直射/制导/慢速武器命中率下降 k"：加法进 −槽，作为 dodgeByWeaponType
 *      按 weapon.category 匹配叠加 —— 与通用闪避数学等价，仅作用域不同
 *   3. "对某舰种命中率提升 k"：加法进 +槽，作为 hitBonusByTargetClass
 *      按 target.class 匹配叠加 —— 与 hitBonus 同位置
 *
 * 即"命中提升/闪避/规避/命中率下降"四类词条都是同一对括号里的加法项，
 * 区别仅在符号(+/-)与作用域(全局/舰种/武器类别)。
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

/**
 * 目标当前激活的 buff 摘要（运行时状态）。
 * 由 simulator 在每次命中判定时从 RuntimeShip 收集传入。
 * 仅含命中相关的 dodge/hitBonus 修饰，按 stat 聚合后加法叠加。
 */
export interface ActiveBuffs {
  /** 各 stat 的加法叠加总和（正=提升/负=下降） */
  dodge?: number;
  hitBonus?: number;
}

/** 命中率计算的中间结果，便于测试断言 */
export interface HitCalc {
  /** 该武器对该目标的基础命中率（查表，0~1）。区间模式下为本发 roll 出的值 */
  base: number;
  /** 命中加成（蓝图强化等） */
  bonus: number;
  /** 对舰种命中提升（命中目标舰种时） */
  bonusByClass: number;
  /** 临时 buff 提供的命中加成（加法，正值提升/负值下降） */
  bonusByBuff: number;
  /** 目标通用闪避率 */
  dodge: number;
  /** 目标对当前武器类别的额外闪避（匹配 weapon.category 时） */
  dodgeByType: number;
  /** 临时 buff 提供的额外闪避（加法叠加） */
  dodgeByBuff: number;
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
 * 公式：base × (1 + bonus + 对舰种命中 + buff加成 − 通用闪避 − 武器类别闪避 − buff闪避)，
 * 再夹到 [10%, 95%]。
 *
 * 加法结构（实测验证）：面板修饰与临时 buff 共用同一对槽，全部加法叠加：
 *   +槽：hitBonus + hitBonusByTargetClass + activeBuffs.hitBonus
 *   −槽：dodge + dodgeByWeaponType + activeBuffs.dodge
 *
 * 注：基础命中率按目标 class 查表，查不到则用默认 0.5。
 *     区间模式下用**中值**估算（确定性），仅用于纯函数场景；
 *     实际每发命中判定见 hitCheck（在区间内 roll）。
 */
export function computeHitRate(weapon: WeaponSystem, target: Ship, buffs?: ActiveBuffs): number {
  const base = baseHitMid(weapon.baseHit[target.class]);
  const { bonus, bonusByClass, bonusByBuff, dodge, dodgeByType, dodgeByBuff } = resolveModifiers(weapon, target, buffs);
  const raw = base * (1 + bonus + bonusByClass + bonusByBuff - dodge - dodgeByType - dodgeByBuff);
  return clampHitRate(raw);
}

/**
 * 解析命中公式的全部修饰项（命中 +槽、闪避 −槽）。
 * 单独抽出便于 computeHitRate（纯函数估算）与 hitCheck（含 roll）共用，
 * 保证两条路径计算同一组修饰项，不出现分叉。
 *
 * buffs 为可选的目标当前激活 buff 摘要；缺省时视为无 buff（向后兼容）。
 */
export function resolveModifiers(weapon: WeaponSystem, target: Ship, buffs?: ActiveBuffs) {
  const bonus = weapon.hitBonus ?? 0;
  const bonusByClass = weapon.hitBonusByTargetClass?.[target.class] ?? 0;
  const bonusByBuff = buffs?.hitBonus ?? 0;
  const dodge = target.dodge;
  const cat = weapon.category ?? 'direct';
  const dodgeByType = target.dodgeByWeaponType?.[cat] ?? 0;
  const dodgeByBuff = buffs?.dodge ?? 0;
  return { bonus, bonusByClass, bonusByBuff, dodge, dodgeByType, dodgeByBuff };
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
export function hitCheck(weapon: WeaponSystem, target: Ship, rng: RNG, buffs?: ActiveBuffs): HitCalc {
  const { bonus, bonusByClass, bonusByBuff, dodge, dodgeByType, dodgeByBuff } = resolveModifiers(weapon, target, buffs);
  // 区间模式 roll base，单值模式直接取
  const base = rollBaseHit(weapon.baseHit[target.class], rng);
  const raw = base * (1 + bonus + bonusByClass + bonusByBuff - dodge - dodgeByType - dodgeByBuff);
  const final = clampHitRate(raw);
  const roll = rng.next();
  const hit = roll < final;
  return { base, bonus, bonusByClass, bonusByBuff, dodge, dodgeByType, dodgeByBuff, final, hit, roll };
}
