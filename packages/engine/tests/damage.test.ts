/**
 * 伤害结算测试 —— docs §1 伤害二分法（减法模型）
 *
 * 实弹公式：实际 = dph − resistance（dph>resistance）；否则保底伤害
 * 能量公式：实际 = dph × (1 − shield)，忽略抵抗
 * 暴击：× critMultiplier
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { damageCalc, kineticDamage } from '../src/phases/damage.js';
import { resetConfig, setConfig } from '../src/core/config.js';
import { makeWeapon, makeShip, cell } from './fixtures.js';

test.beforeEach(() => resetConfig());

test('kineticDamage: 高单发打低抵抗 = 减法（dph=100,res=10 → 90）', () => {
  const r = kineticDamage(100, 10);
  assert.equal(r.damage, 90);
  assert.equal(r.floored, false);
});

test('kineticDamage: 减法结果低于保底则取保底', () => {
  // dph=15, res=10 → 净5，但保底=15×10%=1.5，5>1.5 不触发保底
  const r1 = kineticDamage(15, 10);
  assert.equal(r1.damage, 5);
  assert.equal(r1.floored, false);
  // dph=11, res=10 → 净1，保底=1.1，1<1.1 触发保底
  const r2 = kineticDamage(11, 10);
  assert.equal(r2.damage, 1.1);
  assert.equal(r2.floored, true);
});

test('kineticDamage: 破不了甲时取 dph×10% 保底', () => {
  // dph=30, res=36 → 30<36 → 保底=30×10%=3（FG300实测值）
  const r = kineticDamage(30, 36);
  assert.equal(r.damage, 3);
  assert.equal(r.floored, true);
});

test('kineticDamage: 抵抗0则全额', () => {
  assert.equal(kineticDamage(100, 0).damage, 100);
  assert.equal(kineticDamage(100, 0).floored, false);
});

test('kineticDamage: 保底系数可配置', () => {
  setConfig({ kineticFloorRatio: 0.2 }); // 改成20%
  // dph=30, res=36 → 保底=30×0.2=6
  assert.equal(kineticDamage(30, 36).damage, 6);
  assert.equal(kineticDamage(30, 36).floored, true);
});

test('实弹伤害: 100单发打抵抗10（标准甲）', () => {
  const w = makeWeapon({ id: 'w', dph: 100, damageType: 'kinetic' });
  const t = makeShip({ id: 't', cell: cell('enemy', 'front'), resistance: 10 });
  const r = damageCalc(w, t, false);
  assert.equal(r.crit, false);
  assert.equal(r.critMultiplier, 1);
  assert.equal(r.floored, false);
  assert.equal(r.final, 90); // 100−10
});

test('实弹伤害: 暴击翻倍', () => {
  const w = makeWeapon({ id: 'w', dph: 100, damageType: 'kinetic', critMultiplier: 2.0 });
  const t = makeShip({ id: 't', cell: cell('enemy', 'front'), resistance: 10 });
  const r = damageCalc(w, t, true);
  assert.equal(r.final, (100 - 10) * 2.0); // (100−10)×2 = 180
});

test('实弹伤害: 破不了甲时暴击基于保底（dph×10%）', () => {
  // dph=30, res=36 → 保底=3，暴击×2 → 6
  const w = makeWeapon({ id: 'w', dph: 30, damageType: 'kinetic', critMultiplier: 2.0 });
  const t = makeShip({ id: 't', cell: cell('enemy', 'front'), resistance: 36 });
  const r = damageCalc(w, t, true);
  assert.equal(r.floored, true);
  assert.equal(r.final, 3 * 2.0); // 保底3 × 暴击2 = 6
});

test('能量伤害: 受护盾削减，忽略抵抗', () => {
  const w = makeWeapon({ id: 'w', dph: 100, damageType: 'energy' });
  // 护盾 2% = 0.02，抵抗 999（应被忽略）
  const t = makeShip({ id: 't', cell: cell('enemy', 'front'), shield: 0.02, resistance: 999 });
  const r = damageCalc(w, t, false);
  assert.equal(r.resistanceOrShield, 0.02);
  assert.equal(r.final, 100 * (1 - 0.02)); // 98
});

test('能量伤害: 护盾0则全额', () => {
  const w = makeWeapon({ id: 'w', dph: 100, damageType: 'energy' });
  const t = makeShip({ id: 't', cell: cell('enemy', 'front'), shield: 0 });
  const r = damageCalc(w, t, false);
  assert.equal(r.final, 100);
});

test('默认暴击倍率 = 2.0', () => {
  const w = makeWeapon({ id: 'w', dph: 100, damageType: 'energy' });
  const t = makeShip({ id: 't', cell: cell('enemy', 'front') });
  const r = damageCalc(w, t, true);
  assert.equal(r.critMultiplier, 2.0);
});
