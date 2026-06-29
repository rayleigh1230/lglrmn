/**
 * 浮点时间测试 —— 验证小数冷却/持续/锁定时间精确还原
 *
 * 游戏面板的冷却/持续/锁定参数会出现小数（如 5.5s），引擎去掉 Math.round
 * 后用浮点秒，精确还原小数循环节奏。整除场景仍得整数（向后兼容）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulate, createRNG } from '../src/index.js';
import { makeWeapon, makeShip, makeFleet, cell } from './fixtures.js';

/** 全命中不暴击的 RNG（每发取2个值：hit=0命中，crit=1不暴击） */
function alwaysHitNoCrit() {
  let i = 0;
  return {
    next: () => {
      const v = i % 2 === 0 ? 0 : 0.99;
      i++;
      return v;
    },
  };
}

/** 取某武器的开火时间序列 */
function fireTimes(report: ReturnType<typeof simulate>, weaponId: string): number[] {
  return report.attacks
    .filter((a) => a.attackerWeaponId === weaponId)
    .map((a) => a.time);
}

test('小数冷却：cooldown=2.5s → 开火序列 [0, 2.5, 5.0, 7.5]', () => {
  const attacker = makeShip({
    id: 'A',
    cell: cell('ally', 'front'),
    weapons: [makeWeapon({ id: 'gun', dph: 100, shotsPerCycle: 1, fireDuration: 0, cooldown: 2.5, baseHit: { destroyer: 1.0 } })],
  });
  const defender = makeShip({
    id: 'D',
    cell: cell('enemy', 'front'),
    structure: 1_000_000,
    resistance: 0,
    dodge: 0,
    class: 'destroyer',
    weapons: [],
  });
  const report = simulate(makeFleet([attacker]), makeFleet([defender]), {
    maxTime: 8,
    rng: alwaysHitNoCrit() as any,
  });
  // t=0, 2.5, 5.0, 7.5（7.5<=8 在范围内）
  assert.deepEqual(fireTimes(report, 'gun'), [0, 2.5, 5.0, 7.5]);
});

test('小数持续：fireDuration=1.5s 打2发 → 间隔0.75s，序列 [0, 0.75]', () => {
  // 旧 Math.round 会把 0.75→1，序列变 [0,1]；浮点应得 [0,0.75]
  const attacker = makeShip({
    id: 'A',
    cell: cell('ally', 'front'),
    weapons: [makeWeapon({ id: 'gun', dph: 100, shotsPerCycle: 2, fireDuration: 1.5, cooldown: 10, baseHit: { destroyer: 1.0 } })],
  });
  const defender = makeShip({
    id: 'D',
    cell: cell('enemy', 'front'),
    structure: 1_000_000,
    resistance: 0,
    dodge: 0,
    class: 'destroyer',
    weapons: [],
  });
  const report = simulate(makeFleet([attacker]), makeFleet([defender]), {
    maxTime: 2,
    rng: alwaysHitNoCrit() as any,
  });
  // 首轮2发在 t=0, 0.75；下一轮首发在 1.5+10=11.5（超出maxTime=2）
  assert.deepEqual(fireTimes(report, 'gun'), [0, 0.75]);
});

test('小数锁定：lockOnTime=1.5s → 首次开火在 t=1.5', () => {
  const attacker = makeShip({
    id: 'A',
    cell: cell('ally', 'front'),
    weapons: [makeWeapon({ id: 'gun', dph: 100, shotsPerCycle: 1, fireDuration: 0, cooldown: 5, lockOnTime: 1.5, baseHit: { destroyer: 1.0 } })],
  });
  const defender = makeShip({
    id: 'D',
    cell: cell('enemy', 'front'),
    structure: 1_000_000,
    resistance: 0,
    dodge: 0,
    class: 'destroyer',
    weapons: [],
  });
  const report = simulate(makeFleet([attacker]), makeFleet([defender]), {
    maxTime: 10,
    rng: alwaysHitNoCrit() as any,
  });
  const times = fireTimes(report, 'gun');
  assert.equal(times[0], 1.5, `首次开火应在 t=1.5（小数锁定），实际 ${times[0]}`);
  // 锁定期内不应开火
  assert.equal(times.filter((t) => t < 1.5).length, 0);
});

test('整除场景向后兼容：3发/3秒仍得整数 [0,1,2]', () => {
  // interval = 3/3 = 1.0，浮点应得整数 0,1,2（与旧 Math.round 一致）
  const attacker = makeShip({
    id: 'A',
    cell: cell('ally', 'front'),
    weapons: [makeWeapon({ id: 'gun', dph: 100, shotsPerCycle: 3, fireDuration: 3, cooldown: 10, baseHit: { destroyer: 1.0 } })],
  });
  const defender = makeShip({
    id: 'D',
    cell: cell('enemy', 'front'),
    structure: 1_000_000,
    resistance: 0,
    dodge: 0,
    class: 'destroyer',
    weapons: [],
  });
  const report = simulate(makeFleet([attacker]), makeFleet([defender]), {
    maxTime: 5,
    rng: alwaysHitNoCrit() as any,
  });
  assert.deepEqual(fireTimes(report, 'gun'), [0, 1, 2]);
});

test('复合小数：cooldown=5.5 + lockOnTime=3.5 → 首发3.5，后续每5.5s', () => {
  const attacker = makeShip({
    id: 'A',
    cell: cell('ally', 'front'),
    weapons: [makeWeapon({ id: 'gun', dph: 100, shotsPerCycle: 1, fireDuration: 0, cooldown: 5.5, lockOnTime: 3.5, baseHit: { destroyer: 1.0 } })],
  });
  const defender = makeShip({
    id: 'D',
    cell: cell('enemy', 'front'),
    structure: 1_000_000,
    resistance: 0,
    dodge: 0,
    class: 'destroyer',
    weapons: [],
  });
  const report = simulate(makeFleet([attacker]), makeFleet([defender]), {
    maxTime: 15,
    rng: alwaysHitNoCrit() as any,
  });
  // 3.5, 9.0, 14.5
  assert.deepEqual(fireTimes(report, 'gun'), [3.5, 9.0, 14.5]);
});
