/**
 * 事件日志 dump 脚本 —— 用 FG300 真实实测数据跑一场，打印攻击时间线，供人工核对。
 *
 * 实测场景：FG300（3个主武器）vs 驱逐舰（抵抗36、闪避25%）
 * 用法：npm run test:dump
 */
import { simulate, createRNG } from '../src/index.js';
import { makeWeapon, makeShip, makeFleet, cell } from './fixtures.js';

function fg300Weapon(id: string) {
  return makeWeapon({
    id,
    dph: 30,
    shotsPerCycle: 3,
    fireDuration: 3,
    cooldown: 4,
    lockOnTime: 3,
    baseHit: { destroyer: 0.65 },
    damageType: 'kinetic',
  });
}

const attacker = makeShip({
  id: 'FG300',
  cell: cell('ally', 'front', 1),
  class: 'destroyer',
  weapons: [fg300Weapon('X3a'), fg300Weapon('X3b'), fg300Weapon('X3c')],
});

const defender = makeShip({
  id: '驱逐舰',
  cell: cell('enemy', 'front', 1),
  class: 'destroyer',
  structure: 100000,
  resistance: 36,
  dodge: 0.25,
  weapons: [],
});

const report = simulate(makeFleet([attacker]), makeFleet([defender]), {
  maxTime: 322,
  rng: createRNG(20260629),
});

console.log('='.repeat(64));
console.log('FG300 vs 驱逐舰 战斗事件日志（实测对齐场景）');
console.log('='.repeat(64));
console.log(`时长: ${report.duration}s | 总攻击: ${report.attacks.length} 次`);

const hits = report.attacks.filter((a) => a.hit).length;
const totalDmg = 100000 - report.survivors.enemy[0].structure;
console.log(`命中: ${hits}/${report.attacks.length} (${((hits / report.attacks.length) * 100).toFixed(1)}%)`);
console.log(`总伤害: ${totalDmg}（实测参考 591）`);
console.log('-'.repeat(64));
console.log('前 30 次攻击时间线：');
console.log('-'.repeat(64));

for (const a of report.attacks.slice(0, 30)) {
  const flag = a.hit ? '【命中】' : '【未命中】';
  console.log(`[t=${String(a.time).padStart(3)}s] ${a.attackerWeaponId} → 驱逐舰 ${flag} 伤害:${a.damage} (剩${a.targetStructureAfter})`);
}

console.log('-'.repeat(64));
console.log('校验点：');
console.log(`  - 保底伤害 = 3（dph30 × 10%，因抵抗36 > dph30）`);
console.log(`  - 首次开火 t=3s（锁定时间）`);
console.log(`  - 循环节奏：每 7s 一轮（持续3s + 冷却4s）`);
console.log(`  - 命中率公式 0.65×(1−0.25)=48.75%`);
