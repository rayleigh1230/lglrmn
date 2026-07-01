/**
 * X未知数法 —— 假设base=中值，反推前摇后摇X，交叉验证
 *
 * 用户思路（2026-07-01）：
 *   1. 轨道炮长战斗更精确 → 假设base=中值(0.60)
 *   2. 游戏设计定期望值不会取小数 → 要么中/上/下限
 *   3. 前摇后摇判断不准 → 当未知数X
 *   4. X = 战报时长 − 用中值算出的净战斗时长
 *   5. 用中值+X 套斗牛4场，看是否自洽
 *
 * 核心判据：
 *   - 轨道炮4场(同武器同场景)反推的X必须【一致】→ 验证中值假设
 *   - 斗牛4场用中值反推的X也必须【一致】→ 验证中值普适性
 *   - 两组X若都一致(哪怕数值不同，因武器不同)，说明"中值假设"成立
 *   - 若X不一致(同组内跳动)，说明中值假设错误
 *
 * 用法：npx tsx tests/analysis/base-midvalue-x-method.ts
 */

// ====== 通用：期望伤害DES模拟，返回净战斗时长(无前摇后摇) ======
// 净战斗时长 = 从首次开火(含锁定)到击毁的纯战斗时间
// X = 战报时长 − 净战斗时长(锁定在净时长内，X是纯额外时间：前摇+后摇)

interface WeaponSpec {
  perHit: number; cd: number; lock: number; cnt: number; base: number;
}

function simulateNetTime(
  weapons: WeaponSpec[],
  N: number,
  HP: number,
  k: number,        // 命中加成
  dodge: number,    // 闪避(含buff)
): number {
  let hp = HP;
  type Evt = { t: number; wi: number; ci: number; s: number };
  const events: Evt[] = [];
  for (let s = 0; s < N; s++) {
    for (let wi = 0; wi < weapons.length; wi++) {
      const w = weapons[wi];
      for (let ci = 0; ci < w.cnt; ci++) events.push({ t: w.lock, wi, ci, s });
    }
  }
  events.sort((a, b) => a.t - b.t);

  let ei = 0;
  let now = 0;
  let guard = 0;
  while (hp > 0 && guard++ < 2000000) {
    if (ei >= events.length) break;
    now = events[ei].t;
    while (ei < events.length && events[ei].t <= now + 1e-9) {
      const e = events[ei];
      const w = weapons[e.wi];
      const hr = Math.min(0.95, Math.max(0.10, w.base * (1 + k - dodge)));
      hp -= w.perHit * hr;
      events.push({ t: now + w.cd, wi: e.wi, ci: e.ci, s: e.s });
      ei++;
    }
    events.sort((a, b) => a.t - b.t);
  }
  return now; // 净战斗时长(含锁定，不含前后摇)
}

// ====== 场景1：轨道炮（base=中值0.60，区间50-70%）======
const RAIL_PER_HIT = 930; // 1200-270
const railgun: WeaponSpec[] = [{
  perHit: RAIL_PER_HIT, cd: 8.4, lock: 8, cnt: 2, base: 0.60, // 中值
}];
const CARRIER_HP = 370192;

// ====== 场景2：斗牛（base=中值 主0.85/副0.60）======
const BULL_PER_HIT_M = 525 * (1 - 0.03); // 509.25
const BULL_PER_HIT_S = 28 * (1 - 0.03);  // 27.16
const bullWeapons: WeaponSpec[] = [
  { perHit: BULL_PER_HIT_M, cd: 2.7, lock: 4, cnt: 1, base: 0.85 }, // 主 中值
  { perHit: BULL_PER_HIT_S, cd: 2.1, lock: 3, cnt: 3, base: 0.60 }, // 副 中值
];
const BULL_HP = 52223;
const DODGE = 0.20;
const BUFF_DODGE = 0.40;
const BUFF_DUR = 45;
const TRIG_FRAC = 0.60;

// 斗牛有策略靶需要模拟buff（重写一个支持buff的版本）
function simulateNetTimeBull(k: number, hasBuff: boolean): number {
  let hp = BULL_HP;
  let buffActive = false;
  let buffEnd = Infinity;
  type Evt = { t: number; wi: number; ci: number; s: number };
  const events: Evt[] = [];
  const N = 10;
  for (let s = 0; s < N; s++) {
    for (let wi = 0; wi < bullWeapons.length; wi++) {
      const w = bullWeapons[wi];
      for (let ci = 0; ci < w.cnt; ci++) events.push({ t: w.lock, wi, ci, s });
    }
  }
  events.sort((a, b) => a.t - b.t);

  let ei = 0;
  let now = 0;
  let guard = 0;
  while (hp > 0 && guard++ < 2000000) {
    if (ei >= events.length) break;
    now = events[ei].t;
    if (buffActive && now >= buffEnd) buffActive = false;
    while (ei < events.length && events[ei].t <= now + 1e-9) {
      const e = events[ei];
      const w = bullWeapons[e.wi];
      const curDodge = hasBuff && buffActive ? DODGE + BUFF_DODGE : DODGE;
      const hr = Math.min(0.95, Math.max(0.10, w.base * (1 + k - curDodge)));
      hp -= w.perHit * hr;
      if (hasBuff && !buffActive && hp <= BULL_HP * TRIG_FRAC) {
        buffActive = true;
        buffEnd = now + BUFF_DUR;
      }
      events.push({ t: now + w.cd, wi: e.wi, ci: e.ci, s: e.s });
      ei++;
    }
    events.sort((a, b) => a.t - b.t);
  }
  return now;
}

console.log('='.repeat(88));
console.log('X未知数法 —— 假设base=中值，反推前摇后摇X，交叉验证');
console.log('='.repeat(88));
console.log('假设: 轨道炮base=0.60(中值), 斗牛主base=0.85/副base=0.60(中值)');
console.log('X = 战报时长 − 净战斗时长(中值算出)');
console.log('判据: 同组场景X必须一致 → 中值假设成立\n');

// ====== 轨道炮4场 ======
console.log('【场景1：轨道炮（base=0.60中值，dodge=0）】');
console.log('  N | 战报  | 净战斗时长(中值) | X=战报−净 | 预测战报(用X均值)');
console.log('  ' + '-'.repeat(78));
const railScenes = [
  { N: 8, T: 342 },
  { N: 6, T: 445 },
  { N: 4, T: 677 },
  { N: 2, T: 1350 },
];
const railXs: number[] = [];
for (const r of railScenes) {
  const net = simulateNetTime(railgun, r.N, CARRIER_HP, 0, 0);
  const X = r.T - net;
  railXs.push(X);
  console.log(`  ${r.N} | ${String(r.T).padStart(4)}s |  ${net.toFixed(1).padStart(6)}s      | ${X.toFixed(1).padStart(5)}s  |`);
}
const railXmean = railXs.reduce((a, b) => a + b, 0) / railXs.length;
const railXrange = Math.max(...railXs) - Math.min(...railXs);
console.log(`  X均值=${railXmean.toFixed(2)}s, X跨度=${railXrange.toFixed(2)}s`);
// 重新打印预测列
console.log('\n  用X均值重算预测战报:');
console.log('  N | 战报  | 净时长  | X均值  | 预测战报 | 误差');
console.log('  ' + '-'.repeat(60));
for (const r of railScenes) {
  const net = simulateNetTime(railgun, r.N, CARRIER_HP, 0, 0);
  const pred = net + railXmean;
  const err = pred - r.T;
  console.log(`  ${r.N} | ${String(r.T).padStart(4)}s | ${net.toFixed(1).padStart(5)}s | ${railXmean.toFixed(1).padStart(5)}s | ${pred.toFixed(1).padStart(6)}s | ${(err>=0?'+':'')}${err.toFixed(1)}s`);
}

// ====== 斗牛4场 ======
console.log('\n【场景2：斗牛（base=主0.85/副0.60中值，dodge=20%）】');
console.log('  场景        | 战报 | 净战斗时长(中值) | X=战报−净');
console.log('  ' + '-'.repeat(60));
const bullScenes = [
  { name: '无策略+0%',  k: 0,    hasBuff: false, T: 50 },
  { name: '无策略+30%', k: 0.30, hasBuff: false, T: 42 },
  { name: '有策略+0%',  k: 0,    hasBuff: true,  T: 74 },
  { name: '有策略+30%', k: 0.30, hasBuff: true,  T: 52 },
];
const bullXs: number[] = [];
for (const b of bullScenes) {
  const net = simulateNetTimeBull(b.k, b.hasBuff);
  const X = b.T - net;
  bullXs.push(X);
  console.log(`  ${b.name.padEnd(11)} | ${String(b.T).padStart(3)}s |  ${net.toFixed(1).padStart(6)}s      | ${X.toFixed(1).padStart(5)}s`);
}
const bullXmean = bullXs.reduce((a, b) => a + b, 0) / bullXs.length;
const bullXrange = Math.max(...bullXs) - Math.min(...bullXs);
console.log(`  X均值=${bullXmean.toFixed(2)}s, X跨度=${bullXrange.toFixed(2)}s`);

// ====== 斗牛用X均值重算 ======
console.log('\n  用X均值重算预测战报:');
console.log('  场景        | 战报 | 净时长  | X均值  | 预测战报 | 误差');
console.log('  ' + '-'.repeat(60));
let bullTotalErr = 0;
for (const b of bullScenes) {
  const net = simulateNetTimeBull(b.k, b.hasBuff);
  const pred = net + bullXmean;
  const err = pred - b.T;
  bullTotalErr += Math.abs(err);
  console.log(`  ${b.name.padEnd(11)} | ${String(b.T).padStart(3)}s | ${net.toFixed(1).padStart(5)}s | ${bullXmean.toFixed(1).padStart(5)}s | ${pred.toFixed(1).padStart(6)}s | ${(err>=0?'+':'')}${err.toFixed(1)}s`);
}
console.log(`  斗牛平均绝对误差: ${(bullTotalErr/4).toFixed(1)}s`);

// ====== 判据总结 ======
console.log('\n' + '='.repeat(88));
console.log('【判据总结：X是否一致 → 中值假设是否成立】');
console.log('='.repeat(88));
console.log(`  轨道炮组: X跨度=${railXrange.toFixed(2)}s (X=${railXs.map(x=>x.toFixed(1)).join(', ')})`);
console.log(`  斗牛组:   X跨度=${bullXrange.toFixed(2)}s (X=${bullXs.map(x=>x.toFixed(1)).join(', ')})`);
console.log('');
console.log('  解读规则:');
console.log('    X跨度<2s  → 同组X一致 → 中值假设【成立】，X是稳定的前后摇');
console.log('    X跨度>4s  → 同组X跳动 → 中值假设【错误】，base不是中值');
console.log('');
if (railXrange < 2 && bullXrange < 2) {
  console.log('  ★ 两组X都一致 → base=中值假设成立！X='+railXmean.toFixed(1)+'s(轨道炮)/'+bullXmean.toFixed(1)+'s(斗牛)');
} else if (railXrange < 2) {
  console.log('  ⚠ 轨道炮X一致但斗牛X跳动 → 斗牛base不是中值，或+30%有衰减污染');
  console.log('    需看斗牛+0%档X是否一致(排除+30%衰减)');
} else {
  console.log('  ✗ 轨道炮X也跳动 → 中值假设对轨道炮也不成立');
}

// ====== 单独看斗牛+0%档（排除+30%衰减污染）======
console.log('\n' + '='.repeat(88));
console.log('【斗牛+0%档单独验证（排除+30%加成衰减污染）】');
console.log('='.repeat(88));
const bull0Scenes = bullScenes.filter(b => b.k === 0);
const bull0Xs: number[] = [];
console.log('  场景        | 战报 | 净时长  | X');
console.log('  ' + '-'.repeat(50));
for (const b of bull0Scenes) {
  const net = simulateNetTimeBull(b.k, b.hasBuff);
  const X = b.T - net;
  bull0Xs.push(X);
  console.log(`  ${b.name.padEnd(11)} | ${String(b.T).padStart(3)}s | ${net.toFixed(1).padStart(5)}s | ${X.toFixed(1)}s`);
}
const bull0Xrange = Math.max(...bull0Xs) - Math.min(...bull0Xs);
console.log(`  +0%档X跨度=${bull0Xrange.toFixed(2)}s ${bull0Xrange<2?'→ 一致 ✓':'→ 跳动 ✗'}`);
