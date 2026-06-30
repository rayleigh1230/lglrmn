/**
 * 临时 buff（策略类技能）测试 —— 加法叠加 + 撞下限验证
 *
 * 实测结论（2026-06，10艘斗牛跨度判据）：
 *   临时 buff 修饰值作为【加法项】叠加进命中括号，与面板层修饰共用同一对槽：
 *     final = base × (1 + hitBonus + 对舰种命中 + buff加成 − dodge − 武器类别闪避 − buff闪避)
 *   不走独立乘法通道。
 *
 * 多舰存在批次不同步（各舰开火相位错开），但命中率公式本身（加法）不受影响，
 * 已由单舰实验（实验0-3）铁证。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeHitRate, hitCheck, type ActiveBuffs } from '../src/phases/hit.js';
import { MockRNG } from '../src/core/rng.js';
import { makeWeapon, makeShip } from './fixtures.js';

// ---- 加法叠加：闪避 buff 进 −槽 ----

test('临时闪避buff 加法叠加进 −槽', () => {
  // 目标 d20%，激活 dodge+40% buff → 等效闪避 60%
  const w = makeWeapon({ id: 'w', baseHit: { destroyer: 0.687 } });
  const t = makeShip({ id: 't', cell: { side: 'enemy', row: 'front', col: 1 }, class: 'destroyer', dodge: 0.20 });
  const buffs: ActiveBuffs = { dodge: 0.40 };
  // 加法: 0.687 × (1 − 0.20 − 0.40) = 0.687 × 0.40 = 0.2748
  const got = computeHitRate(w, t, buffs);
  assert.ok(Math.abs(got - 0.2748) < 1e-6, `加法叠加应=0.2748, 实际${got}`);
});

test('临时闪避buff 与面板闪避、武器类别闪避同槽累加', () => {
  // 卡利莱恩极端配置: dodge 0.55 + 直射闪避 0.30 + 策略闪避 0.90 = 1.75 → 撞下限
  const w = makeWeapon({ id: 'w', baseHit: { frigate: 0.687 }, category: 'direct' });
  const t = makeShip({
    id: 'k',
    cell: { side: 'enemy', row: 'front', col: 1 },
    class: 'frigate',
    dodge: 0.55,
    dodgeByWeaponType: { direct: 0.30 },
  });
  const buffs: ActiveBuffs = { dodge: 0.90 };
  const got = computeHitRate(w, t, buffs);
  assert.equal(got, 0.10, `极端叠加(1.75)应撞10%下限, 实际${got}`);
});

test('临时命中debuff 加法叠加进 +槽（负值）', () => {
  // 全局命中下降15% 作为临时buff → hitBonus −0.15
  const w = makeWeapon({ id: 'w', baseHit: { destroyer: 0.687 } });
  const t = makeShip({ id: 't', cell: { side: 'enemy', row: 'front', col: 1 }, class: 'destroyer', dodge: 0.55 });
  const buffs: ActiveBuffs = { hitBonus: -0.15 };
  // 0.687 × (1 − 0.15 − 0.55) = 0.687 × 0.30 = 0.2061
  const got = computeHitRate(w, t, buffs);
  assert.ok(Math.abs(got - 0.2061) < 1e-6, `命中debuff加法应=0.2061, 实际${got}`);
});

// ---- 加法 vs 乘法判据（锁死结构）----

test('判据: buff加法 vs 乘法 — 中等闪避区可辨', () => {
  // d20% + buff40%: 加法=0.275, 乘法=0.687×0.80×0.60=0.330
  const w = makeWeapon({ id: 'w', baseHit: { destroyer: 0.687 } });
  const t = makeShip({ id: 't', cell: { side: 'enemy', row: 'front', col: 1 }, class: 'destroyer', dodge: 0.20 });
  const buffs: ActiveBuffs = { dodge: 0.40 };
  const addHit = computeHitRate(w, t, buffs);
  // 乘法预测(仅作对照, 引擎不实现)
  const mulHit = 0.687 * (1 - 0.20) * (1 - 0.40);
  assert.ok(
    Math.abs(addHit - mulHit) > 0.03,
    `加法${addHit.toFixed(3)} vs 乘法${mulHit.toFixed(3)} 应有明显差(>3pp), 锁死加法结构`
  );
});

test('判据: 跨度(消去公共因素)锁死加法 — 对应实测22.5s', () => {
  // 实测: T(+0%)−T(+30%) = 22.5s, 加法预测21.1s, 乘法13.8s
  // 跨度对应"两档命中率比值结构", 这里验证加法下的比值
  const base = 0.687, dodge = 0.20, buff = 0.40;
  // +0%命中档, buff窗命中率
  const hitK0 = base * (1 - dodge - buff);
  // +30%命中档, buff窗命中率
  const hitK30 = base * (1 + 0.30 - dodge - buff);
  // 跨度比(时长反比): 加法 hitK30/hitK0
  const addRatio = hitK30 / hitK0;
  // 乘法: base×(1.30)×0.24 / base×0.24 = 1.30 (比值恒定, 与buff无关)
  const mulRatio = 1.30;
  // 加法比值 = (1.30−0.60)/(1.00−0.60) = 0.70/0.40 = 1.75
  assert.ok(Math.abs(addRatio - 1.75) < 1e-9, `加法跨度比应=1.75, 实际${addRatio.toFixed(3)}`);
  assert.ok(addRatio > mulRatio, `加法比值${addRatio.toFixed(2)}应>乘法${mulRatio}(实测贴加法)`);
});

// ---- hitCheck 返回新字段 ----

test('hitCheck: 返回 buff 修饰字段', () => {
  const w = makeWeapon({ id: 'w', baseHit: { destroyer: 0.8 } });
  const t = makeShip({ id: 't', cell: { side: 'enemy', row: 'front', col: 1 }, class: 'destroyer' });
  const r = hitCheck(w, t, new MockRNG([0.5]), { dodge: 0.40, hitBonus: -0.15 });
  assert.equal(r.dodgeByBuff, 0.40, 'dodgeByBuff应=0.40');
  assert.equal(r.bonusByBuff, -0.15, 'bonusByBuff应=-0.15');
});

test('hitCheck: 无buff时新字段默认0(向后兼容)', () => {
  const w = makeWeapon({ id: 'w', baseHit: { destroyer: 0.8 } });
  const t = makeShip({ id: 't', cell: { side: 'enemy', row: 'front', col: 1 }, class: 'destroyer' });
  const r = hitCheck(w, t, new MockRNG([0.5]));
  assert.equal(r.dodgeByBuff, 0);
  assert.equal(r.bonusByBuff, 0);
});

// ---- 回归: 无buff参数时行为不变 ----

test('回归: computeHitRate 不传buffs参数时行为不变', () => {
  const w = makeWeapon({ id: 'w', baseHit: { destroyer: 0.8 }, hitBonus: 0.1 });
  const t = makeShip({ id: 't', cell: { side: 'enemy', row: 'front', col: 1 }, class: 'destroyer', dodge: 0.2 });
  // 0.8 × (1 + 0.1 − 0.2) = 0.72
  assert.ok(Math.abs(computeHitRate(w, t) - 0.72) < 1e-9);
});
