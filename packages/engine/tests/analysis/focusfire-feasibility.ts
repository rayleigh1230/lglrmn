/**
 * 多船集火能否放大"临时buff加法vs乘法"的信号差?
 *
 * 核心问题: 信号差 = |加法avgHit − 乘法avgHit|, 噪声 = 命中率测量散布。
 * 多船集火做了什么:
 *   ✓ 总发数 ↑ → 统计噪声 ↓ (发数越多, 实测命中率越接近真值)
 *   ✗ 但【加法与乘法本身的差】(0.4pp) 是 buff 窗占空比决定的, 不变
 *   ✗ 战斗时长 ↓ → buff 窗占空比可能反而 ↓ (buff 持续是固定的)
 *
 * 关键洞察: 多船压缩的是【时间】, 但 buff 持续 45s 是固定的。
 *   - 1v1: T=600s, 占空比 45/600=7.5%, 信号 0.4pp
 *   - 3船集火: T≈200s, 占空比 45/200=22.5%, 信号显著放大!
 *   - 6船集火: T≈100s, 占空比 45/100=45%, 信号进一步放大!
 *
 * 但有个新陷阱: buff 触发条件是【结构值<X%】, 多船秒得快,
 *   触发后可能还没撑满 buff 时长就死了 → 实际 buff 窗 < 45s。
 */
const BASE = 0.687;
const FLOOR = 0.10;
const hitAdd = (d: number, k = 0) => Math.max(BASE * (1 - d - k), FLOOR);
const hitMul = (d: number, k = 0) => Math.max(BASE * (1 - d) * (1 - k), FLOOR);

function simulate(d: number, k: number, totalT: number, buffDur: number, model: 'add' | 'mul') {
  // 假设 buff 在战斗中段触发(粗略), 持续到 buffDur 或战斗结束
  const trigT = totalT * 0.5;
  const buffEnd = Math.min(trigT + buffDur, totalT);
  const tBefore = trigT;
  const tBuff = buffEnd - trigT;
  const tAfter = totalT - buffEnd;
  const hNorm = model === 'add' ? hitAdd(d, 0) : hitMul(d, 0);
  const hBuff = model === 'add' ? hitAdd(d, k) : hitMul(d, k);
  return (hNorm * (tBefore + tAfter) + hBuff * tBuff) / totalT;
}

console.log('='.repeat(94));
console.log('一、不同集火规模下的 信号差 vs 占空比 (假设 buff 全程触发且撑满)');
console.log('='.repeat(94));
console.log('集火规模 | 战斗时长 | buff占空比 | 加法avgHit | 乘法avgHit | 信号差 | 噪声(1/√N)');
console.log('-'.repeat(94));
// 假设 d=20%, k=0.40, buff=45s
for (const [n, T] of [[1, 600], [2, 300], [3, 200], [4, 150], [6, 100]] as [number, number][]) {
  const A = simulate(0.20, 0.40, T, 45, 'add');
  const M = simulate(0.20, 0.40, T, 45, 'mul');
  const sig = Math.abs(A - M) * 100;
  const duty = Math.min(45 / T, 1) * 100;
  // 噪声: 单场散布约2pp, N场平均 → 2/√N; 但发数也随N增加, 综合约 2/√(发数比)
  const noise = 2 / Math.sqrt(n);
  const verdict = sig > noise * 1.5 ? '✓ 可辨' : sig > noise ? '~ 边缘' : '✗';
  console.log(`  ${n}船集火 |   ${String(T).padStart(3)}s   |   ${duty.toFixed(0).padStart(2)}%    |   ${(A*100).toFixed(1)}%    |   ${(M*100).toFixed(1)}%    | ${sig.toFixed(1)}pp |   ±${noise.toFixed(1)}pp ${verdict}`);
}

console.log('\n' + '='.repeat(94));
console.log('二、但有个【反向陷阱】: buff 触发条件是结构<X%, 多船秒太快会"跳过"buff窗');
console.log('='.repeat(94));
console.log('场景: 船A 结构<60%触发, buff持续45s');
console.log('  - 1v1: 慢慢打到60%HP → 触发 → 还能挨45s → buff窗≈完整');
console.log('  - 6船集火: 瞬间从60%打到0% → 触发后【立刻死】 → buff窗≈0!');
console.log('\n触发后剩余血量决定 buff 窗实际长度:');
console.log('集火规模 | 触发时剩余HP占比 | 剩余HP能挨多久 | 实际buff窗 | 实际占空比');
console.log('-'.repeat(94));
// 船A: 60%HP触发, 假设结构值10418(驱逐舰典型)
const HP = 10418;
for (const [n, T] of [[1, 600], [2, 300], [3, 200], [4, 150], [6, 100]] as [number, number][]) {
  // 触发在60%HP → 剩余40%HP; 按 T 时间打死100%HP → 剩余40%能挨 0.4×T
  const remainFrac = 0.40; // 船A触发阈值60%, 剩40%
  const timeAfterTrig = remainFrac * T;
  const realBuff = Math.min(45, timeAfterTrig);
  const realDuty = realBuff / T * 100;
  console.log(`  ${n}船集火 |      60%(剩40%)    |   ${timeAfterTrig.toFixed(0)}s       |   ${realBuff.toFixed(0)}s      |   ${realDuty.toFixed(0)}%`);
}

console.log('\n' + '='.repeat(94));
console.log('三、船B 的反向陷阱更严重: 结构<20%才触发');
console.log('='.repeat(94));
console.log('集火规模 | 触发时剩余HP占比 | 剩余HP能挨多久 | 实际buff窗 | 实际占空比');
console.log('-'.repeat(94));
for (const [n, T] of [[1, 600], [2, 300], [3, 200], [4, 150], [6, 100]] as [number, number][]) {
  const remainFrac = 0.20; // 船B触发阈值20%, 剩20%
  const timeAfterTrig = remainFrac * T;
  const realBuff = Math.min(40, timeAfterTrig);
  const realDuty = realBuff / T * 100;
  console.log(`  ${n}船集火 |      20%(剩20%)    |   ${timeAfterTrig.toFixed(0)}s       |   ${realBuff.toFixed(0)}s      |   ${realDuty.toFixed(0)}%`);
}

console.log('\n' + '='.repeat(94));
console.log('四、综合判定: 实际信号差(扣除反向陷阱)');
console.log('='.repeat(94));
console.log('船   | 集火 | 实际占空比 | 加法avgHit | 乘法avgHit | 实际信号差 | 噪声 | 可辨?');
console.log('-'.repeat(94));
for (const [ship, d, trigRemain, buffDur] of [
  ['船A d20%', 0.20, 0.40, 45],
  ['船B d25%', 0.25, 0.20, 40],
] as [string, number, number, number][]) {
  for (const [n, T] of [[1, 600], [2, 300], [3, 200]] as [number, number][]) {
    const timeAfterTrig = trigRemain * T;
    const realBuff = Math.min(buffDur, timeAfterTrig);
    // 重算 avgHit: buff窗=realBuff, 正常窗=T-realBuff, 触发时刻=(T-realBuff)
    const trigT = T - realBuff;
    const A = (hitAdd(d) * (T - realBuff) + hitAdd(d, 0.40) * realBuff) / T;
    const M = (hitMul(d) * (T - realBuff) + hitMul(d, 0.40) * realBuff) / T;
    const sig = Math.abs(A - M) * 100;
    const noise = 2 / Math.sqrt(n);
    const verdict = sig > noise * 1.5 ? '✓' : sig > noise ? '~' : '✗';
    console.log(`${ship} | ${n}船  |   ${(realBuff/T*100).toFixed(0).padStart(2)}%    |   ${(A*100).toFixed(1)}%   |   ${(M*100).toFixed(1)}%   |   ${sig.toFixed(2)}pp  | ±${noise.toFixed(1)} |  ${verdict}`);
  }
}
