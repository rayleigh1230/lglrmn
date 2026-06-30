/**
 * 战斗仿真引擎 —— 对外公共 API
 *
 * 平台无关的纯逻辑库。编译成 JS 后可被任何外壳（Node 测试 / 小程序 UI / Web）调用。
 *
 * 典型用法：
 *   import { simulate, createRNG } from '@lagrange/engine';
 *   const report = simulate(fleetA, fleetB, { maxTime: 300, rng: createRNG(42) });
 */

// 类型
export type {
  Side,
  Row,
  Cell,
  DamageType,
  WeaponDelivery,
  WeaponCategory,
  TargetClass,
  InterceptScope,
  HitRate,
  WeaponSystem,
  Ship,
  Fighter,
  Fleet,
  RNG,
  TempBuff,
  BuffTrigger,
  BuffStat,
} from './types/index.js';

export type { SimEvent, AttackRecord, BattleReport } from './types/events.js';

// 内核
export { SeededRNG, MockRNG, createRNG } from './core/rng.js';
export { Scheduler } from './core/scheduler.js';
export { simulate, type SimulateOptions } from './core/simulator.js';

// 运行时模型
export { RuntimeShip, RuntimeWeapon, RuntimeFleet } from './model/runtime.js';

// 拓扑
export {
  sameCell,
  sameRow,
  sameSide,
  anywhere,
  isOpposing,
  inScope,
  cellKey,
} from './topology/index.js';

// 结算阶段（便于单独写断言测试）
export {
  computeHitRate,
  resolveModifiers,
  clampHitRate,
  hitCheck,
  rollBaseHit,
  baseHitMid,
  HIT_RATE_MIN,
  HIT_RATE_MAX,
  type HitCalc,
  type ActiveBuffs,
} from './phases/hit.js';

export {
  damageCalc,
  kineticDamage,
  DEFAULT_CRIT_MULTIPLIER,
  type DamageCalc,
} from './phases/damage.js';

export { getConfig, setConfig, resetConfig, DEFAULT_CONFIG, type EngineConfig } from './core/config.js';

export { critCheck, type CritCalc } from './phases/crit.js';
export { selectTarget, aliveShips } from './phases/target.js';
export { interceptCheck, type InterceptResult } from './phases/intercept.js';
