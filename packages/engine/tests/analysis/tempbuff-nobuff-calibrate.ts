/**
 * 无策略靶校准 —— 用硬计数(6发主炮)锁定发数模型
 *
 * 实测: 10艘满面板+30%命中斗牛, 打无策略靶(51632血), 42-43s
 *   主炮(武器1)目测每艘6发
 *
 * 用法：npx tsx tests/tempbuff-nobuff-calibrate.ts
 */
const HP = 51632;
const N = 10;
const T = 42.5;

console.log('='.repeat(80));
console.log('一、发间间隔反推(关键!)');
console.log('='.repeat(80));
const shotsPerShip = 6;
// 首发在锁定后(t=4), 末发约在击杀时(t≈42)
// n发 = (n-1)个间隔 + 首发
const interval = (T - 4) / (shotsPerShip - 1);
console.log(`每艘${shotsPerShip}发, 首@t=4, 末@t≈${T}`);
console.log(`实际发间间隔 = ${interval.toFixed(2)}s`);
console.log(`面板冷却2.7s → 实际是面板的 ${(interval/2.7).toFixed(2)}倍`);
console.log('');
console.log('假设: 完整周期 = 锁定(仅首) + 持续 + 冷却');
console.log(`  若周期=持续0+冷却2.7=2.7: 间隔应2.7s, 实测${interval.toFixed(1)}s ✗`);
console.log(`  若周期含锁定: 间隔 = ? `);

// 试不同周期模型
console.log('\n候选周期模型(看哪个让"6发 in 42s"成立):');
for (const [name, period] of [
  ['冷却2.7', 2.7],
  ['锁定4+冷却2.7=6.7', 6.7],
  ['锁定4×某+冷却', 0],
] as [string, number][]) {
  if (period === 0) continue;
  // 首@t=lockOn, 之后每period一发
  const lockOn = 4;
  let n = 0, t = lockOn;
  while (t <= T + 1e-6) { n++; t += period; }
  console.log(`  ${name} (周期${period}s): ${n}发/艘 in ${T}s ${n === shotsPerShip ? '✓匹配!' : `(实测${shotsPerShip})`}`);
}

console.log('\n' + '='.repeat(80));
console.log('二、用实测间隔反推perHit(无策略靶, 无buff, 干净!)');
console.log('='.repeat(80));
// 无策略靶假设闪避0(无策略), 用+30%命中
// 武器1: 6发/艘×10 = 60发, 命中0.85×(1.30)=1.105→夹95%
// 实际命中率: 区间70-100%, +30%k, 闪避0
//   base∈[0.70,1.00], hit=base×1.30, 夹95%
//   base>0.95/1.30=0.731时夹 → 几乎全夹(0.731到1.00占大部分)
//   平均: 积分
const w1Interval = interval;
const w1Shots = 6 * N; // 60发
// 武器2: 用同比例间隔
const w2Interval = interval * (2.1 / 2.7); // 武器2冷却2.1, 按比例
const w2ShotsPerCanon = Math.floor((T - 3) / w2Interval + 1 + 1e-6);
const w2Shots = w2ShotsPerCanon * 3 * N;
console.log(`武器1: ${w1Shots}发 (每艘6发)`);
console.log(`武器2: ${w2Shots}发 (每门${w2ShotsPerCanon}发×3门×10艘, 间隔${w2Interval.toFixed(1)}s)`);

// 计算武器1平均命中率(含95%上限)
let w1HitSum = 0, w1N = 0;
for (let b = 0.70; b <= 1.0001; b += 0.01) {
  const h = Math.min(b * 1.30, 0.95);
  w1HitSum += h; w1N++;
}
const w1HitAvg = w1HitSum / w1N;
// 武器2: base50-70%, +30%k, 闪避0, hit=base×1.30, 不夹(base×1.30≤0.91)
const w2HitAvg = 0.60 * 1.30; // 中值
console.log(`武器1平均命中(含95%夹): ${(w1HitAvg*100).toFixed(1)}%`);
console.log(`武器2平均命中: ${(w2HitAvg*100).toFixed(1)}%`);

// HP = w1Shots×w1Hit×525×f + w2Shots×w2Hit×28×f
// f = HP / (w1Shots×w1Hit×525 + w2Shots×w2Hit×28)
const denom = w1Shots * w1HitAvg * 525 + w2Shots * w2HitAvg * 28;
const f = HP / denom;
console.log(`\n反推 perHit系数 f = ${f.toFixed(3)}`);
console.log(`  perHit1 = 525×${f.toFixed(3)} = ${(525*f).toFixed(1)}`);
console.log(`  perHit2 = 28×${f.toFixed(3)} = ${(28*f).toFixed(1)}`);
console.log(`  → f=0.97对应护盾3%减伤`);
console.log(`  → f=${f.toFixed(3)} ${f < 0.97 ? '仍偏低, 说明发数或命中还有问题' : f > 0.97 ? '偏高(可能命中算少了)' : '符合护盾3%'}`);

console.log('\n' + '='.repeat(80));
console.log('三、对照: 用【我的错误发数模型】反推f(看偏差多大)');
console.log('='.repeat(80));
// 错误模型: 武器1每2.7s, 武器2每2.1s
const w1ShotsWrong = Math.floor((T - 4) / 2.7 + 1 + 1e-6) * N;
const w2ShotsWrong = Math.floor((T - 3) / 2.1 + 1 + 1e-6) * 3 * N;
console.log(`错误模型: 武器1 ${w1ShotsWrong}发, 武器2 ${w2ShotsWrong}发`);
const denomWrong = w1ShotsWrong * w1HitAvg * 525 + w2ShotsWrong * w2HitAvg * 28;
const fWrong = HP / denomWrong;
console.log(`错误模型反推 f = ${fWrong.toFixed(3)} ← 这就是之前f=0.834/1.112矛盾的来源`);
