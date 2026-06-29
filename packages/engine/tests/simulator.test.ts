/**
 * 仿真器集成测试 —— 验证完整 DES 管道
 *
 * 1. 确定性场景：固定 RNG（全命中、不暴击），用累计伤害反算 DPS，对齐理论值
 * 2. 击沉终止：目标结构归零战斗结束，胜方正确
 * 3. 攻击循环：冷却后正确进入下一轮
 * 4. 固定种子复现：同种子两次仿真结果完全一致
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulate, SeededRNG, createRNG } from '../src/index.js';
import { makeWeapon, makeShip, makeFleet, cell } from './fixtures.js';

/**
 * 让每次攻击都命中、不暴击的 RNG。
 * hitCheck 取一次，critCheck 取一次；命中需要 roll < final（给 0），
 * 不暴击需要 roll >= critRate（给 1）。
 */
function alwaysHitNoCrit() {
  // 循环返回 [0, 1, 0, 1, ...]：hitCheck拿到0(命中)，critCheck拿到1(不暴击)
  let i = 0;
  return {
    next: () => {
      const v = i % 2 === 0 ? 0 : 0.99;
      i++;
      return v;
    },
  };
}

test('1v1 确定性 DPS 对齐：理论 vs 实测', () => {
  // 武器：dph=100，每循环1发，fireDuration=0，cooldown=2 → 循环周期=2s，DPS理论=50
  // 抵抗0 → 每发实弹伤害=100
  const attacker = makeShip({
    id: 'A',
    cell: cell('ally', 'front'),
    weapons: [makeWeapon({ id: 'gun', dph: 100, shotsPerCycle: 1, fireDuration: 0, cooldown: 2, baseHit: { destroyer: 1.0 } })],
  });
  // 目标：足够肉，不击沉，抵抗0
  const defender = makeShip({
    id: 'D',
    cell: cell('enemy', 'front'),
    structure: 1_000_000,
    resistance: 0,
    dodge: 0,
    class: 'destroyer',
    weapons: [], // 不还手
  });

  const report = simulate(makeFleet([attacker]), makeFleet([defender]), {
    maxTime: 20, // 跑 20 秒
    rng: alwaysHitNoCrit() as any,
  });

  // 累计伤害 = 目标初始结构 − 剩余结构
  const totalDamage = 1_000_000 - report.survivors.enemy[0].structure;
  const measuredDPS = totalDamage / 20;

  // 理论 DPS：循环周期2s，每周期1发100伤害。
  // 事件驱动模型下，t=0 开火 → cooldownEnd@t=2 → 下一轮 fire@t=2 ...
  // maxTime=20 含边界，开火序列 [0,2,4,6,8,10,12,14,16,18,20] 共 11 发 = 1100 伤害。
  // 注意：命中判定每次消耗1个rng，这里 alwaysHitNoCrit 每发取2个值(hit,crit)，都命中不暴击。
  assert.equal(totalDamage, 1100, `累计伤害应为1100（11发×100），实际${totalDamage}`);
  // 每发都命中、无暴击
  assert.equal(report.attacks.every((a) => a.hit), true);
  // 每发都命中、无暴击
  assert.equal(report.attacks.every((a) => a.hit), true);
  assert.equal(report.attacks.every((a) => !a.crit), true);
  assert.equal(report.attacks.length, 11);
});

test('击沉终止：目标归零战斗结束，胜方=ally', () => {
  // dph=1000，每秒一发，目标只有 2500 结构 → 第3发击沉
  const attacker = makeShip({
    id: 'A',
    cell: cell('ally', 'front'),
    weapons: [makeWeapon({ id: 'gun', dph: 1000, cooldown: 1, baseHit: { destroyer: 1.0 } })],
  });
  const defender = makeShip({
    id: 'D',
    cell: cell('enemy', 'front'),
    structure: 2500,
    resistance: 0,
    dodge: 0,
    class: 'destroyer',
    weapons: [],
  });

  const report = simulate(makeFleet([attacker]), makeFleet([defender]), {
    maxTime: 100,
    rng: alwaysHitNoCrit() as any,
  });

  assert.equal(report.winner, 'ally');
  assert.equal(report.survivors.enemy.length, 0); // 敌方全灭
  assert.ok(report.duration < 100, '应提前结束');
  // 击中次数：前两发各1000，第三发击沉（伤害结算后归零）
  assert.equal(report.attacks.length, 3);
});

test('固定种子复现：两次仿真结果完全一致', () => {
  const attacker = makeShip({
    id: 'A',
    cell: cell('ally', 'front'),
    weapons: [makeWeapon({ id: 'gun', dph: 100, cooldown: 2 })],
  });
  const defender = makeShip({
    id: 'D',
    cell: cell('enemy', 'front'),
    structure: 10000,
    resistance: 10,
    dodge: 0,
    class: 'destroyer',
    weapons: [],
  });

  const r1 = simulate(makeFleet([attacker]), makeFleet([defender]), { maxTime: 30, rng: createRNG(42) });
  const r2 = simulate(makeFleet([attacker]), makeFleet([defender]), { maxTime: 30, rng: createRNG(42) });

  assert.deepEqual(r1.attacks, r2.attacks, '同种子应产生完全相同的攻击序列');
  assert.equal(r1.winner, r2.winner);
  assert.deepEqual(r1.survivors, r2.survivors);
});

test('双方互射：都有存活时判定为 draw（超时）', () => {
  // 双方都很肉，maxTime 内打不死，应判 draw
  const mk = (id: string, side: 'ally' | 'enemy') =>
    makeShip({
      id,
      cell: cell(side, 'front'),
      structure: 1_000_000,
      resistance: 10,
      dodge: 0,
      class: 'destroyer',
      weapons: [makeWeapon({ id: id + '-gun', dph: 50, cooldown: 2 })],
    });

  const report = simulate(makeFleet([mk('A', 'ally')]), makeFleet([mk('B', 'enemy')]), {
    maxTime: 10,
    rng: alwaysHitNoCrit() as any,
  });

  assert.equal(report.winner, 'draw');
  assert.equal(report.survivors.ally.length, 1);
  assert.equal(report.survivors.enemy.length, 1);
});

test('攻击记录结构完整', () => {
  const attacker = makeShip({
    id: 'A',
    cell: cell('ally', 'front'),
    weapons: [makeWeapon({ id: 'gun', dph: 100, cooldown: 5, baseHit: { destroyer: 1.0 } })],
  });
  const defender = makeShip({
    id: 'D',
    cell: cell('enemy', 'front'),
    structure: 1000,
    resistance: 0,
    dodge: 0,
    class: 'destroyer',
    weapons: [],
  });

  const report = simulate(makeFleet([attacker]), makeFleet([defender]), {
    maxTime: 5,
    rng: alwaysHitNoCrit() as any,
  });

  const a = report.attacks[0];
  assert.equal(a.attackerShipId, 'A');
  assert.equal(a.attackerWeaponId, 'gun');
  assert.equal(a.targetShipId, 'D');
  assert.equal(a.damage, 100);
  assert.equal(a.hit, true);
  assert.equal(a.targetStructureAfter, 900);
  assert.equal(a.time, 0);
});
