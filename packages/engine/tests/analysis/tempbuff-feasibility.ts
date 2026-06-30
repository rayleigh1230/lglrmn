/**
 * 验证"临时闪避 buff 是否乘法"的【可观测性】分析
 *
 * 两个候选船(均驱逐舰):
 *   船A: d20% + 结构<60% 触发 闪避+40% 持续45s
 *   船B: d25% + 结构<20% 触发 闪避+40% 持续40s
 *
 * 攻击方: FG300 (base≈0.687, 直射, 每发 perHit 取决于目标抵抗)
 * 公式: final = base × (1 − d − k) [加法]  或  base × (1−d) × (1−k) [乘法]
 * 夹 [10%, 95%]
 *
 * 关键约束: 用户只能拿到【终态伤害曲线】, 无法精确截单点。
 *   ⇒ 必须看【整段战斗的时间加权平均命中率】, 并比较加法/乘法模型的差异
 *      是否【大于测量噪声】, 才能定论。
 */
const BASE = 0.687;
const FLOOR = 0.10;
const hitAdd = (d: number, k = 0) => Math.max(BASE * (1 - d - k), FLOOR);
const hitMul = (d: number, k = 0) => Math.max(BASE * (1 - d) * (1 - k), FLOOR);

console.log('='.repeat(92));
console.log('一、单点命中率: 加法 vs 乘法 (看 buff 窗是否离底)');
console.log('='.repeat(92));
console.log('配置                    | 加法(进−槽) | 乘法(作用final) | 差值   | 离底?');
console.log('-'.repeat(92));
const cfgs = [
  ['船A d20% + buff40%', 0.20, 0.40],
  ['船B d25% + buff40%', 0.25, 0.40],
  ['船A d20% 无buff(对照)', 0.20, 0],
  ['船B d25% 无buff(对照)', 0.25, 0],
];
for (const [name, d, k] of cfgs) {
  const a = hitAdd(d, k), m = hitMul(d, k);
  const dist = (a - m) * 100;
  const awayFloor = Math.min(a, m) > FLOOR + 0.01;
  console.log(`${name.padEnd(26)} |   ${(a * 100).toFixed(1)}%    |    ${(m * 100).toFixed(1)}%      | ${dist.toFixed(1)}pp |  ${awayFloor ? '✓ 是' : '✗ 否(饱和)'}`);
}

console.log('\n' + '='.repeat(92));
console.log('二、时间加权平均命中率 (整场可观测的量)');
console.log('='.repeat(92));
console.log('公式: avgHit = [ hit_正常 × T_正常 + hit_buff × T_buff ] / T_total');
console.log('关键: buff 窗时长占比(占空比) 越大, 加法/乘法的 avgHit 差越明显。\n');

// FG300 节奏: 锁3 + 3发 + 冷却4 = 周期7s, 3门 → 每秒约 9/7 发
const FG_RATE = 9 / 7; // 发/秒

function simulate(d: number, k: number, trigFrac: number, buffDur: number, totalT: number, model: 'add' | 'mul') {
  // trigFrac: 触发时刻占整场比例(如0.6=60%血量), buffDur秒; buff 仅触发一次
  const trigT = totalT * trigFrac;
  const buffEnd = Math.min(trigT + buffDur, totalT);
  const tNormal1 = trigT;                       // 触发前
  const tBuff = buffEnd - trigT;                // buff 窗
  const tNormal2 = totalT - buffEnd;            // buff 结束后
  const hNorm = model === 'add' ? hitAdd(d, 0) : hitMul(d, 0);
  const hBuff = model === 'add' ? hitAdd(d, k) : hitMul(d, k);
  const avgHit = (hNorm * (tNormal1 + tNormal2) + hBuff * tBuff) / totalT;
  return { avgHit, hNorm, hBuff, tNormal1, tBuff, tNormal2 };
}

// 假设整场 600s (10min, 典型驱逐舰单挑时长)
for (const totalT of [600]) {
  console.log(`假设整场 ${totalT}s:`);
  for (const [name, d, k, trigFrac, dur] of [
    ['船A d20% +40%@60%HP/45s', 0.20, 0.40, 0.40, 45], // 触发在60%HP≈战斗40%时间点(粗估)
    ['船B d25% +40%@20%HP/40s', 0.25, 0.40, 0.80, 40], // 触发在20%HP≈战斗80%时间点
  ] as [string, number, number, number, number][]) {
    const A = simulate(d, k, trigFrac, dur, totalT, 'add');
    const M = simulate(d, k, trigFrac, dur, totalT, 'mul');
    const diff = (A.avgHit - M.avgHit) * 100;
    console.log(`  ${name}`);
    console.log(`     正常窗命中: 加法=${(A.hNorm*100).toFixed(1)}% 乘法=${(M.hNorm*100).toFixed(1)}`);
    console.log(`     buff窗命中:  加法=${(A.hBuff*100).toFixed(1)}% 乘法=${(M.hBuff*100).toFixed(1)}`);
    console.log(`     时间加权avg: 加法=${(A.avgHit*100).toFixed(2)}% 乘法=${(M.avgHit*100).toFixed(2)}%  差=${diff.toFixed(2)}pp`);
  }
}

console.log('\n' + '='.repeat(92));
console.log('三、关键判据: 加法/乘法 avgHit 差 vs 测量噪声');
console.log('='.repeat(92));
console.log('• 命中率测量噪声 ≈ ±2pp (基于之前多场次散布, 如卡利莱恩基线 30.1/31.1)');
console.log('• 若 加法−乘法 avgHit 差 < 2pp → 【无法分辨】(噪声淹没)');
console.log('• 若 差 > 4pp → 【可分辨】(需多场次平均)');
console.log('• 上面两船的 buff 窗加法均未撞底(加法 d20%+40%=60%→27.5%, d25%+40%=65%→24.0%),');
console.log('  这是【离底】的难得配置, 数学上可辨。问题只在【占空比】够不够大。');

console.log('\n' + '='.repeat(92));
console.log('四、占空比敏感性: buff 窗越靠后/越短, 信号越弱');
console.log('='.repeat(92));
console.log('触发时刻 | buff时长 | buff占空比 | 加法avgHit | 乘法avgHit | 差值  | 可辨?');
console.log('-'.repeat(92));
for (const [trigLabel, trigFrac, dur] of [
  ['船A @40%时间/45s', 0.40, 45],
  ['船B @80%时间/40s', 0.80, 40],
] as [string, number, number][]) {
  const T = 600;
  const A = simulate(0.20, 0.40, trigFrac, dur, T, 'add'); // 用船A的d20%
  const M = simulate(0.20, 0.40, trigFrac, dur, T, 'mul');
  const duty = dur / T;
  const diff = (A.avgHit - M.avgHit) * 100;
  console.log(`${trigLabel.padEnd(16)} |  ${dur}s    |  ${(duty*100).toFixed(1)}%    |   ${(A.avgHit*100).toFixed(1)}%    |   ${(M.avgHit*100).toFixed(1)}%    | ${diff.toFixed(1)}pp | ${diff > 2 ? '✓' : '✗(噪声内)'}`);
}
