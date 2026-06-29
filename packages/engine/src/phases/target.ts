/**
 * 目标选择阶段（docs §6 攻击序列）
 *
 * 武器有目标优先级（targetPriority），按优先级在存活敌方舰船中选择。
 * MVP-1：单目标场景，直接返回唯一存活敌方。
 * MVP-3 起完善：按优先级排序 + 跨格可达性（直射受排限制，投射可跨格）。
 *
 * 本阶段是纯函数。
 */
import type { WeaponSystem } from '../types/index.js';
import type { RuntimeShip } from '../model/runtime.js';

/**
 * 选择攻击目标。
 *
 * @param weapon  攻击武器
 * @param enemies 存活敌方舰船（运行时状态）
 * @returns 选中的目标，或 null（无可选目标）
 */
export function selectTarget(
  _weapon: WeaponSystem,
  enemies: RuntimeShip[]
): RuntimeShip | null {
  // MVP-1：忽略优先级，返回第一个存活敌方。
  // MVP-3 将改为：按 targetPriority 过滤 → 直射武器受格位可达性约束 → 投射武器可跨格
  if (enemies.length === 0) return null;
  return enemies[0];
}

/** 从舰船数组中筛出仍存活的（structure > 0） */
export function aliveShips(ships: RuntimeShip[]): RuntimeShip[] {
  return ships.filter((s) => s.structure > 0);
}
