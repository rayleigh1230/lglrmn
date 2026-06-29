/**
 * 命中率区间测试 —— 验证 baseHit 区间建模（每发独立 roll）
 *
 * 游戏面板命中率显示为区间（如 50%-70%），引擎把 baseHit 存成 {min,max}，
 * 每发开火在区间内独立 roll 一个 base 值，再套公式做命中判定。
 *
 * 关键点：
 *   1. 区间模式：每次 hitCheck 消耗 2 次 RNG（baseRoll + hitRoll）
 *   2. 单值模式：每次 hitCheck 消耗 1 次 RNG（仅 hitRoll）→ 向后兼容
 *   3. computeHitRate 是纯函数，区间用中值估算
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeHitRate,
  clampHitRate,
  hitCheck,
  rollBaseHit,
  baseHitMid,
  HIT_RATE_MIN,
  HIT_RATE_MAX,
} from '../src/phases/hit.js';
import { MockRNG } from '../src/core/rng.js';
import { makeWeapon, makeShip } from './fixtures.js';

// ---- rollBaseHit / baseHitMid 单元测试 ----

test('rollBaseHit: 单值直接返回，不消耗 RNG', () => {
  const rng = new MockRNG([0.5]); // 给了值但单值模式不应取用
  assert.equal(rollBaseHit(0.8, rng), 0.8);
  assert.equal(rollBaseHit(undefined, rng), 0.5); // 缺省默认0.5
});

test('rollBaseHit: 区间在 [min,max] 内线性 roll', () => {
  // min + r*(max-min)：min=0.5,max=0.7
  // r=0 → 0.5，r=0.5 → 0.6，r=0.999 → 0.6998
  assert.equal(rollBaseHit({ min: 0.5, max: 0.7 }, new MockRNG([0])), 0.5);
  assert.equal(rollBaseHit({ min: 0.5, max: 0.7 }, new MockRNG([0.5])), 0.6);
  assert.equal(rollBaseHit({ min: 0.5, max: 0.7 }, new MockRNG([0.999])), 0.6998);
});

test('baseHitMid: 单值返回本身，区间返回中值', () => {
  assert.equal(baseHitMid(0.8), 0.8);
  assert.equal(baseHitMid({ min: 0.5, max: 0.7 }), 0.6);
  assert.equal(baseHitMid(undefined), 0.5);
});

// ---- computeHitRate 纯函数（区间用中值）----

test('computeHitRate: 区间 baseHit 用中值估算（纯函数）', () => {
  const w = makeWeapon({ id: 'w', baseHit: { destroyer: { min: 0.5, max: 0.7 } } });
  const t = makeShip({ id: 't', cell: { side: 'enemy', row: 'front', col: 1 }, dodge: 0.1, class: 'destroyer' });
  // 中值0.6 × (1 − 0.1) = 0.54
  assert.ok(Math.abs(computeHitRate(w, t) - 0.54) < 1e-9, `期望0.54，实际${computeHitRate(w, t)}`);
});

test('computeHitRate: 单值 baseHit 向后兼容', () => {
  const w = makeWeapon({ id: 'w', baseHit: { destroyer: 0.8 }, hitBonus: 0.1 });
  const t = makeShip({ id: 't', cell: { side: 'enemy', row: 'front', col: 1 }, dodge: 0.2, class: 'destroyer' });
  // 0.8 × (1 + 0.1 − 0.2) = 0.72
  assert.ok(Math.abs(computeHitRate(w, t) - 0.72) < 1e-9);
});

// ---- hitCheck 的 RNG 消耗顺序 ----

test('hitCheck: 单值模式消耗1次RNG（仅命中roll）→ 向后兼容', () => {
  const w = makeWeapon({ id: 'w', baseHit: { destroyer: 0.8 } });
  const t = makeShip({ id: 't', cell: { side: 'enemy', row: 'front', col: 1 }, class: 'destroyer' });
  // final=0.8。MockRNG只给1个值0.5（<0.8命中），不应报"序列耗尽"
  const r = hitCheck(w, t, new MockRNG([0.5]));
  assert.equal(r.hit, true);
  assert.equal(r.base, 0.8);
  assert.equal(r.final, 0.8);
});

test('hitCheck: 区间模式消耗2次RNG（baseRoll + hitRoll）', () => {
  const w = makeWeapon({ id: 'w', baseHit: { destroyer: { min: 0.5, max: 0.7 } } });
  const t = makeShip({ id: 't', cell: { side: 'enemy', row: 'front', col: 1 }, class: 'destroyer', dodge: 0 });
  // 第1个RNG=0.5 → base = 0.5 + 0.5×(0.7−0.5) = 0.6 → final=0.6
  // 第2个RNG=0.55 → 0.55 < 0.6 → 命中
  const r = hitCheck(w, t, new MockRNG([0.5, 0.55]));
  assert.equal(r.base, 0.6);
  assert.equal(r.final, 0.6);
  assert.equal(r.hit, true);
});

test('hitCheck: 区间模式不同 RNG → 不同 base（每发独立）', () => {
  const w = makeWeapon({ id: 'w', baseHit: { destroyer: { min: 0.5, max: 0.7 } } });
  const t = makeShip({ id: 't', cell: { side: 'enemy', row: 'front', col: 1 }, class: 'destroyer', dodge: 0 });
  // baseRoll=0 → base=0.5；baseRoll=1 → base=0.7
  const low = hitCheck(w, t, new MockRNG([0, 0.3])); // base=0.5, roll=0.3<0.5命中
  const high = hitCheck(w, t, new MockRNG([1, 0.3])); // base=0.7, roll=0.3<0.7命中
  assert.equal(low.base, 0.5);
  assert.equal(high.base, 0.7);
});

// ---- 边界：区间经公式后被夹到 10%~95% ----

test('hitCheck: 区间下限经闪避后夹到10%下限', () => {
  // base最低0.5，dodge=0.95 → 0.5×(1−0.95)=0.025 → 夹到0.1
  const w = makeWeapon({ id: 'w', baseHit: { destroyer: { min: 0.5, max: 0.7 } } });
  const t = makeShip({ id: 't', cell: { side: 'enemy', row: 'front', col: 1 }, class: 'destroyer', dodge: 0.95 });
  const r = hitCheck(w, t, new MockRNG([0, 0.05])); // base=0.5→夹0.1, roll=0.05<0.1命中
  assert.equal(r.final, HIT_RATE_MIN);
  assert.equal(r.hit, true);
});
