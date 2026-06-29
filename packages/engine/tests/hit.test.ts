/**
 * 命中判定测试 —— docs §3
 *
 * 公式：final = clamp( base × (1 + bonus − dodge), [10%, 95%] )
 * 判定：roll < final ⇒ 命中
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeHitRate, clampHitRate, hitCheck, HIT_RATE_MIN, HIT_RATE_MAX } from '../src/phases/hit.js';
import { critCheck } from '../src/phases/crit.js';
import { MockRNG } from '../src/core/rng.js';
import { makeWeapon, makeShip } from './fixtures.js';

test('clampHitRate: 下限10% 上限95%', () => {
  assert.equal(clampHitRate(0.5), 0.5);
  assert.equal(clampHitRate(0.05), HIT_RATE_MIN); // 0.1
  assert.equal(clampHitRate(1.5), HIT_RATE_MAX); // 0.95
  assert.equal(clampHitRate(0), HIT_RATE_MIN);
});

test('computeHitRate: 基础公式 base×(1+bonus−dodge)', () => {
  const w = makeWeapon({ id: 'w', baseHit: { destroyer: 0.8 }, hitBonus: 0.1 });
  const t = makeShip({ id: 't', cell: { side: 'enemy', row: 'front', col: 1 }, dodge: 0.2, class: 'destroyer' });
  // 0.8 × (1 + 0.1 − 0.2) = 0.8 × 0.9 = 0.72
  assert.ok(Math.abs(computeHitRate(w, t) - 0.72) < 1e-9, `期望0.72，实际${computeHitRate(w, t)}`);
});

test('computeHitRate: 闪避过高夹到下限10%', () => {
  const w = makeWeapon({ id: 'w', baseHit: { destroyer: 0.5 } });
  const t = makeShip({ id: 't', cell: { side: 'enemy', row: 'front', col: 1 }, dodge: 0.95, class: 'destroyer' });
  // 0.5 × (1 − 0.95) = 0.025 → 夹到 0.1
  assert.equal(computeHitRate(w, t), HIT_RATE_MIN);
});

test('computeHitRate: 目标class查表不到用默认0.5', () => {
  const w = makeWeapon({ id: 'w', baseHit: { destroyer: 0.8 } }); // 只对驱逐有命中
  const t = makeShip({ id: 't', cell: { side: 'enemy', row: 'front', col: 1 }, class: 'cruiser', dodge: 0 });
  // 查不到 cruiser → 默认 0.5
  assert.equal(computeHitRate(w, t), 0.5);
});

test('hitCheck: roll < final 命中', () => {
  const w = makeWeapon({ id: 'w', baseHit: { destroyer: 0.8 }, hitBonus: 0 });
  const t = makeShip({ id: 't', cell: { side: 'enemy', row: 'front', col: 1 }, dodge: 0, class: 'destroyer' });
  // final = 0.8
  const hit1 = hitCheck(w, t, new MockRNG([0.79]));
  assert.equal(hit1.hit, true);
  assert.equal(hit1.final, 0.8);
  const hit2 = hitCheck(w, t, new MockRNG([0.81]));
  assert.equal(hit2.hit, false);
});

test('critCheck: 未指定暴击率则永不暴击（rate=0）', () => {
  const w = makeWeapon({ id: 'w' }); // 不指定 critRate → rate=0
  // roll < 0 永远为 false（即使 roll=0，0<0 也是 false）
  const r1 = critCheck(w, new MockRNG([0.99]));
  assert.equal(r1.rate, 0);
  assert.equal(r1.crit, false);
  const r2 = critCheck(w, new MockRNG([0]));
  assert.equal(r2.rate, 0);
  assert.equal(r2.crit, false);
});

test('critCheck: 自定义暴击率', () => {
  const w = makeWeapon({ id: 'w', critRate: 0.5 });
  assert.equal(critCheck(w, new MockRNG([0.49])).crit, true);
  assert.equal(critCheck(w, new MockRNG([0.51])).crit, false);
});
