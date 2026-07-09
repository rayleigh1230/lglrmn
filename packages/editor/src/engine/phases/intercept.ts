/**
 * 拦截判定阶段（docs §8.5 反导拦截）
 *
 * 完整拦截公式（来源：WIKI《武器命中率与拦截率计算公式》）：
 *   总拦截率 = 1 − (1−全队拦截率)^a × (1−同排拦截率)^b × (1−自身拦截率)
 *   实际拦截率 = 总拦截率 × (1 − 敌方反拦截率)
 *
 * MVP-1 暂不激活（无投射武器/拦截舰），返回"未拦截"。
 * 扩展-2（舰载机/反导层）再实现累乘公式。
 *
 * 接口先行定义，保证结算管道完整。
 */
import type { WeaponSystem } from '../types/index';
import type { RuntimeShip } from '../model/runtime';

export interface InterceptResult {
  /** 是否被拦截（本次攻击被击落，不造成伤害） */
  intercepted: boolean;
  /** 最终拦截率（0~1） */
  rate: number;
}

/**
 * MVP-1 占位实现：不拦截。
 * 扩展-2 将实现累乘公式（遍历防守方拦截武器，按 scope 汇总）。
 */
export function interceptCheck(
  _weapon: WeaponSystem,
  _target: RuntimeShip,
  _defenders: RuntimeShip[]
): InterceptResult {
  return { intercepted: false, rate: 0 };
}
