/**
 * 诊断: fireDuration=0 时 scheduleWeaponCycle 如何处理多发(shotsPerCycle>1)?
 *
 * 阋神星武器2: 持续0 弹药2 → shotsPerCycle=2, fireDuration=0
 * 现有逻辑: interval = fireDuration/shots = 0/2 = 0
 *           → 2个 weaponFire 事件都在 t=startTime (同时打出)
 *
 * 这符合"弹药2=一次开火打2发"的实测语义吗?
 * 关键: 这2发是【独立命中判定】还是【一次性打2发算1次命中】?
 *   - 若独立判定 → 命中率不受影响(每发单独roll), shotsPerCycle=2正确
 *   - 若一次性 → 命中率应按"1次开火"算, shotsPerCycle应=1
 *
 * 从反推: 用 shotsPerCycle=2 反推 base=0.698 ✓ 落在标定区间
 *         用 shotsPerCycle=1 反推 base=1.396 ✗ 不可能
 *   → 证实: 弹药2 的2发是【独立命中判定】, shotsPerCycle=2 正确。
 *
 * 结论: 现有引擎对"弹药2 持续0"的处理正确(2个同时刻独立weaponFire事件)。
 *       但需要在 WeaponSystem 文档里明确 shotsPerCycle 的语义。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulate, createRNG } from '../src/index.js';
import { makeWeapon, makeShip, makeFleet } from './fixtures.js';

test('诊断: fireDuration=0 + shotsPerCycle=2 → 2个同时刻独立开火事件', () => {
  // 阋神星武器2简化版: dph100, 持续0, 2发, 冷却10, 锁定0
  // 打一个高血靶, 跑2秒, 看 attacks 数量
  const w = makeWeapon({
    id: 'w2',
    dph: 100,
    shotsPerCycle: 2,
    fireDuration: 0,
    cooldown: 100, // 长冷却, 只看首轮
    lockOnTime: 0,
    baseHit: { destroyer: 1.0 }, // 必命中, 看发数
    structure: 99999,
  });
  const target = makeShip({
    id: 'target',
    cell: { side: 'enemy', row: 'front', col: 1 },
    structure: 999999, // 打不死
    class: 'destroyer',
  });
  const attacker = makeShip({
    id: 'attacker',
    cell: { side: 'ally', row: 'front', col: 1 },
    weapons: [w],
  });
  const report = simulate(makeFleet([attacker]), makeFleet([target]), { maxTime: 1, rng: createRNG(1) });
  // t=0 应打出 2 个 weaponFire 事件 → 2 条 attack 记录
  assert.equal(report.attacks.length, 2, `fireDuration=0 + 2发应产生2条攻击记录, 实际${report.attacks.length}`);
});

test('诊断: FG300式 持续3 + 3发 → 3个间隔1s的开火事件', () => {
  const w = makeWeapon({
    id: 'fg300',
    dph: 30,
    shotsPerCycle: 3,
    fireDuration: 3,
    cooldown: 100,
    lockOnTime: 0,
    baseHit: { destroyer: 1.0 },
    structure: 99999,
  });
  const target = makeShip({
    id: 'target',
    cell: { side: 'enemy', row: 'front', col: 1 },
    structure: 999999,
    class: 'destroyer',
  });
  const attacker = makeShip({
    id: 'attacker',
    cell: { side: 'ally', row: 'front', col: 1 },
    weapons: [w],
  });
  const report = simulate(makeFleet([attacker]), makeFleet([target]), { maxTime: 5, rng: createRNG(1) });
  // t=0,1,2 三发
  assert.equal(report.attacks.length, 3);
  assert.equal(report.attacks[0].time, 0);
  assert.equal(report.attacks[1].time, 1);
  assert.equal(report.attacks[2].time, 2);
});
