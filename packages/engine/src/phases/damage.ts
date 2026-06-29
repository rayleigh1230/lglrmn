/**
 * 伤害结算阶段（docs §1 伤害二分法）
 *
 * 游戏只有两种伤害类型：
 *   实弹(kinetic)：实际单发 = 面板单发 − 抵抗值（减法模型，破不了甲时吃保底）
 *   能量(energy)：实际单发 = 面板单发 × (1 − 护盾值)，忽略抵抗
 *
 * 公式来源：游戏内实测（用户提供的实弹减法模型）。
 *
 * 暴击：造成 critMultiplier 倍伤害（默认 2.0）。
 *
 * 本阶段是纯函数：给定武器、目标、是否暴击 → 单发实际伤害。
 *
 * 【待校准】实弹保底伤害（dph ≤ resistance 时的每发最低伤害）是官方黑盒，
 * 当前用 config.kineticFloorDamage 占位，待采样测试标定（见 docs/02-采样测试方案.md）。
 */
import type { Ship, WeaponSystem } from '../types/index.js';
import { getConfig } from '../core/config.js';

/** 伤害结算的中间结果，便于测试断言 */
export interface DamageCalc {
  /** 单发基础伤害 */
  dph: number;
  /** 伤害类型 */
  damageType: WeaponSystem['damageType'];
  /** 是否暴击 */
  crit: boolean;
  /** 抵抗值（实弹）/ 护盾削减系数（能量），仅作记录 */
  resistanceOrShield: number;
  /** 暴击倍率 */
  critMultiplier: number;
  /** 是否触发了保底伤害（实弹 dph ≤ resistance） */
  floored: boolean;
  /** 最终单发伤害 */
  final: number;
}

/** 默认暴击倍率 */
export const DEFAULT_CRIT_MULTIPLIER = 2.0;

/**
 * 实弹单发伤害（减法模型 + 保底）。
 *
 *   净伤害 = dph − resistance
 *   保底值 = dph × kineticFloorRatio（默认 10%）
 *   实际伤害 = max(净伤害, 保底值)
 *
 * 即：破不了甲（或减法结果低于保底）时，每发至少造成 dph×10% 的伤害。
 *
 * 保底 10% 基于首次实测标定：FG300 单发30打抵抗36，实测每发=3=30×10%。
 * 待测试二（不同 dph 的场景）确认是"按比例"还是"固定值"。
 *
 * @returns { damage, floored } floored=true 表示触发保底
 */
export function kineticDamage(dph: number, resistance: number): { damage: number; floored: boolean } {
  const floor = dph * getConfig().kineticFloorRatio;
  const net = dph - resistance;
  if (net >= floor) {
    return { damage: net, floored: false };
  }
  return { damage: floor, floored: true };
}

/**
 * 计算单发实际伤害（不含命中/暴击的随机判定，仅做数值结算）。
 *
 * @param weapon  攻击武器
 * @param target  目标舰船
 * @param crit    本次是否暴击
 */
export function damageCalc(weapon: WeaponSystem, target: Ship, crit: boolean): DamageCalc {
  const { dph, damageType } = weapon;
  const critMultiplier = crit ? (weapon.critMultiplier ?? DEFAULT_CRIT_MULTIPLIER) : 1;

  let raw: number; // 暴击前的单发伤害
  let floored = false;
  let resistanceOrShield = 0;

  switch (damageType) {
    case 'kinetic': {
      // 实弹：减法模型
      resistanceOrShield = target.resistance;
      const k = kineticDamage(dph, target.resistance);
      raw = k.damage;
      floored = k.floored;
      break;
    }
    case 'energy':
      // 能量：受护盾削弱，忽略抵抗
      resistanceOrShield = target.shield;
      raw = dph * (1 - target.shield);
      break;
  }

  const final = raw * critMultiplier;
  return { dph, damageType, crit, resistanceOrShield, critMultiplier, floored, final };
}

