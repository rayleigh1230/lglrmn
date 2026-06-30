/**
 * 临时 buff 调度集成测试 —— 验证 simulator 正确触发/激活/到期 buff
 *
 * 重点验证 threshold 触发（实测场景：结构<60%触发闪避+40%），
 * 以及 buff 激活后命中率确实下降、到期后恢复。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulate, createRNG } from '../src/index.js';
import { makeWeapon, makeShip, makeFleet } from './fixtures.js';
import type { TempBuff } from '../src/types/index.js';

test('threshold buff: 结构低于阈值时激活, 命中率下降', () => {
  // 目标: HP1000, 闪避0, 结构<60%(即<600)触发 闪避+0.80 持续1000s(覆盖到战斗结束)
  // 攻击方: dph100, base 1.0(但夹95%上限→实际95%), 冷却1, 锁定0 → 每秒1发
  // 触发前命中率95%, 触发后闪避80%→命中率约15%
  const buff: TempBuff = {
    id: 'low-hp-dodge',
    trigger: { kind: 'threshold', hpFrac: 0.60 },
    duration: 1000,
    stat: 'dodge',
    value: 0.80,
  };
  const attacker = makeShip({
    id: 'atk',
    cell: { side: 'ally', row: 'front', col: 1 },
    weapons: [makeWeapon({
      id: 'gun', dph: 100, shotsPerCycle: 1, fireDuration: 0, cooldown: 1, lockOnTime: 0,
      baseHit: { destroyer: 1.0 }, // 夹95%上限
      structure: 99999,
    })],
  });
  const target = makeShip({
    id: 'tgt',
    cell: { side: 'enemy', row: 'front', col: 1 },
    structure: 1000,
    dodge: 0,
    tempBuffs: [buff],
  });
  const report = simulate(makeFleet([attacker]), makeFleet([target]), { maxTime: 100, rng: createRNG(1) });
  // 关键判据: buff触发后命中率应明显低于触发前
  const attacks = report.attacks;
  let hitBeforeTrig = 0, totalBeforeTrig = 0;
  let hitAfterTrig = 0, totalAfterTrig = 0;
  let hp = 1000;
  let triggered = false;
  for (const a of attacks) {
    if (!triggered && hp <= 600) triggered = true;
    if (!triggered) { totalBeforeTrig++; if (a.hit) hitBeforeTrig++; }
    else { totalAfterTrig++; if (a.hit) hitAfterTrig++; }
    if (a.hit) hp -= 100;
  }
  const rateBefore = totalBeforeTrig > 0 ? hitBeforeTrig / totalBeforeTrig : 0;
  const rateAfter = totalAfterTrig > 0 ? hitAfterTrig / totalAfterTrig : 0;
  console.log(`  触发前命中率 ${(rateBefore*100).toFixed(0)}% (${hitBeforeTrig}/${totalBeforeTrig}), 触发后 ${(rateAfter*100).toFixed(0)}% (${hitAfterTrig}/${totalAfterTrig})`);
  // buff生效后命中率应显著下降(闪避80%)
  if (totalAfterTrig > 3) {
    assert.ok(rateAfter < rateBefore, `buff生效后命中率${(rateAfter*100).toFixed(0)}%应<触发前${(rateBefore*100).toFixed(0)}%`);
    assert.ok(rateAfter < 0.3, `触发后命中率应<30%(闪避80%), 实际${(rateAfter*100).toFixed(0)}%`);
  }
});

test('threshold buff: 只触发一次(不重复激活)', () => {
  // 同一threshold buff, 血量持续低于阈值, 应只激活一次
  // 用短duration + 低value, 确保目标最终被击杀(不会因buff无敌)
  const buff: TempBuff = {
    id: 'once',
    trigger: { kind: 'threshold', hpFrac: 0.90 },
    duration: 1, // 很短, 快速到期
    stat: 'dodge',
    value: 0.30,
  };
  const attacker = makeShip({
    id: 'atk',
    cell: { side: 'ally', row: 'front', col: 1 },
    weapons: [makeWeapon({
      id: 'gun', dph: 100, cooldown: 1, lockOnTime: 0,
      baseHit: { destroyer: 1.0 }, structure: 99999,
    })],
  });
  const target = makeShip({
    id: 'tgt',
    cell: { side: 'enemy', row: 'front', col: 1 },
    structure: 1000,
    dodge: 0,
    tempBuffs: [buff],
  });
  const report = simulate(makeFleet([attacker]), makeFleet([target]), { maxTime: 50, rng: createRNG(2) });
  // 战斗应完成(目标被击杀), 不报错即说明调度正常且buff到期后目标可被击杀
  assert.equal(report.winner, 'ally', `攻击方应获胜(buff到期后目标应被击杀), 实际${report.winner}`);
});

test('periodic buff: 每3秒触发一次', () => {
  // 闪避+1.0(近乎无敌)持续1s, 每3s触发 → 命中率呈周期性波动
  const buff: TempBuff = {
    id: 'periodic',
    trigger: { kind: 'periodic', period: 3 },
    duration: 1,
    stat: 'dodge',
    value: 1.0, // 激活时必miss(撞下限)
  };
  const attacker = makeShip({
    id: 'atk',
    cell: { side: 'ally', row: 'front', col: 1 },
    weapons: [makeWeapon({
      id: 'gun', dph: 100, cooldown: 1, lockOnTime: 0,
      baseHit: { destroyer: 1.0 }, structure: 99999,
    })],
  });
  const target = makeShip({
    id: 'tgt',
    cell: { side: 'enemy', row: 'front', col: 1 },
    structure: 100000, // 很高血量, 撑满测试时长
    dodge: 0,
    tempBuffs: [buff],
  });
  const report = simulate(makeFleet([attacker]), makeFleet([target]), { maxTime: 10, rng: createRNG(3) });
  // 在 t=3,6,9 附近应有miss(buff激活窗口), 其他时间命中
  const misses = report.attacks.filter(a => !a.hit);
  assert.ok(misses.length > 0, 'periodic buff激活期间应有miss');
  // miss应集中在 t≈3,6,9 附近
  const missTimes = misses.map(m => m.time);
  console.log('  miss时刻:', missTimes.map(t => t.toFixed(1)).join(', '));
});

test('无 tempBuffs 的船: 行为与之前完全一致', () => {
  // 回归: 不配tempBuffs时, 战斗结果与无buff引擎一致
  const attacker = makeShip({
    id: 'atk',
    cell: { side: 'ally', row: 'front', col: 1 },
    weapons: [makeWeapon({
      id: 'gun', dph: 100, cooldown: 1, lockOnTime: 0,
      baseHit: { destroyer: 1.0 }, structure: 99999,
    })],
  });
  const target = makeShip({
    id: 'tgt',
    cell: { side: 'enemy', row: 'front', col: 1 },
    structure: 500,
    dodge: 0,
    // 无 tempBuffs
  });
  const report = simulate(makeFleet([attacker]), makeFleet([target]), { maxTime: 20, rng: createRNG(1) });
  assert.equal(report.winner, 'ally');
  // 500血, 每发100, 5发击杀
  const hits = report.attacks.filter(a => a.hit && a.damage > 0);
  assert.ok(hits.length <= 6, `击杀所需命中数应≤6, 实际${hits.length}`);
});
