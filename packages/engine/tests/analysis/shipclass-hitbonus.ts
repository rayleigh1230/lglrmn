/**
 * 反推"对某舰种命中率提升 X%"词条的作用方式
 *
 * ⚠️ 本组是【双船互殴、打到死】场景，伤害被卡利莱恩血量封顶(10418)。
 *    所以主信号不用"伤害÷发数"，而用【击杀时间】：
 *      DPS = 卡利莱恩HP / 击杀时间
 *      DPS = 每秒发数 × perHit × 命中率
 *    ⇒  命中率 = HP / (击杀时间 × 每秒发数 × perHit)
 *
 *    更强的是【比值判据】(消去 HP/perHit/发数标定)：
 *      命中率(+30%)/命中率(+15%) = 击杀时间(+15%)/击杀时间(+30%)
 *    这个比值与伤害封顶完全无关，是最干净的裁决。
 *
 * FG300 多用途(攻击方): dph36/3发/持续3/冷却4/锁定3/3门/区间50-70%, 对护卫舰命中+k
 *   perHit = 36 − 卡利莱恩抵抗8 = 28
 * 卡利莱恩(防御方): 闪避55%, 抵抗8, 结构10418 (护卫舰) ← FG300 对护卫舰的+k 生效
 *
 * 两种假设(bonus=0, base≈0.687 由前序实验锚定):
 *   A1 加法进槽(主假设, 对称于已证"dodge加法"):  hit = base × (1 + k − dodge)
 *   A2 乘法(对base放大):                          hit = base × (1 − dodge) × (1 + k)
 *
 * 用法：npx tsx tests/shipclass-hitbonus.ts
 */

function fg300ShotsAt(time: number): number {
  // 3门，每周期：锁定3(仅首次) + 3发(1发/秒×3s) + 冷却4 → 周期7s
  let total = 0;
  let cycleStart = 3;
  while (cycleStart <= time + 1e-6) {
    for (let i = 0; i < 3; i++) if (cycleStart + i <= time + 1e-6) total++;
    cycleStart += 7;
  }
  return total * 3; // ×3门
}

const PER_HIT = 28;       // FG300 dph36 − 卡利莱恩抵抗8
const HP = 10418;         // 卡利莱恩结构(击杀阈值)
const BASE = 0.687;       // 锚定 base(前序 dodge/直射实验反推均值)
const DODGE = 0.55;       // 卡利莱恩通用闪避 35%+20%

// [击杀时间 mm:ss 字符串, 秒, 记录伤害]
function mmss(s: string): number {
  const [m, sec] = s.split(':').map(Number);
  return m * 60 + sec;
}

const groups = [
  { k: 0.15, name: '对护卫+k=15%', obs: [['11:54', 10308], ['11:24', 10418], ['12:21', 10418]] },
  { k: 0.30, name: '对护卫+k=30%', obs: [['9:50', 10658], ['9:41', 10658], ['9:28', 10658]] },
];

console.log('='.repeat(94));
console.log('反推"对某舰种命中率提升"——FG300(对护卫+k) 击杀 卡利莱恩(dodge55%)【击杀时间法】');
console.log('='.repeat(94));

console.log('\n场次 | 击杀时间 | 秒  | 记录伤害 | FG300发数 | 隐含命中率(HP/发数/perHit)');
console.log('-'.repeat(94));
const means: Record<number, { rate: number; time: number }> = {};
for (const g of groups) {
  const rates: number[] = [];
  const times: number[] = [];
  for (const [ts, dmg] of g.obs) {
    const T = mmss(ts);
    const shots = fg300ShotsAt(T);
    // 用 HP(10418) 作分子；记录伤害里 +15%组=实际伤害(10308/10418)，+30%组含过杀(10658>HP)
    const numerator = Math.min(dmg, HP);
    const rate = numerator / (shots * PER_HIT);
    const overkill = dmg > HP ? ` (记录${dmg}>HP, 过杀, 已截断)` : '';
    rates.push(rate);
    times.push(T);
    console.log(
      `${g.name} |  ${ts}  | ${String(T).padStart(4)} | ${String(dmg).padStart(6)} | ${String(shots).padStart(8)} |   ${(rate * 100).toFixed(2)}%${overkill}`
    );
  }
  means[g.k] = {
    rate: rates.reduce((a, b) => a + b, 0) / rates.length,
    time: times.reduce((a, b) => a + b, 0) / times.length,
  };
}

console.log('\n' + '='.repeat(94));
console.log('【判据一·绝对命中率】(锚 base=0.687, dodge=0.55)');
console.log('='.repeat(94));
console.log('  k   | 击杀时间均值 | 实测命中率 | A1加法 base×(1+k−d) | A2乘法 base×(1−d)(1+k)');
console.log('-'.repeat(94));
for (const g of groups) {
  const obs = means[g.k].rate;
  const A1 = BASE * (1 + g.k - DODGE);
  const A2 = BASE * (1 - DODGE) * (1 + g.k);
  console.log(
    `+${(g.k * 100).toFixed(0)}% |   ${Math.round(means[g.k].time)}s     |  ${(obs * 100).toFixed(1)}%  |    ${(A1 * 100).toFixed(1)}%          |    ${(A2 * 100).toFixed(1)}%`
  );
}

console.log('\n' + '='.repeat(94));
console.log('【判据二·比值】(黄金标准: 与 HP/perHit/发数 标定完全无关, 纯结构)');
console.log('='.repeat(94));
const tRatio = means[0.15].time / means[0.30].time; // = 命中率(+30%)/命中率(+15%)
console.log(`击杀时间均值:  +15% = ${Math.round(means[0.15].time)}s,  +30% = ${Math.round(means[0.30].time)}s`);
console.log(`实测  命中率比值(+30% / +15%) = T(+15%)/T(+30%) = ${tRatio.toFixed(3)}`);
const ratioA1 = (1 + 0.30 - DODGE) / (1 + 0.15 - DODGE); // base/dodge 约掉
const ratioA2 = (1 + 0.30) / (1 + 0.15);
console.log(`A1加法预测  (1.30−d)/(1.15−d)        = ${ratioA1.toFixed(3)}   ${Math.abs(tRatio - ratioA1) < Math.abs(tRatio - ratioA2) ? '✓ 更接近' : ''}`);
console.log(`A2乘法预测  1.30/1.15                = ${ratioA2.toFixed(3)}   ${Math.abs(tRatio - ratioA2) < Math.abs(tRatio - ratioA1) ? '✓ 更接近' : ''}`);

console.log('\n' + '='.repeat(94));
console.log('【判据三·反推 base】(若 A1 成立, 两组反推 base 应近似常数, 且≈0.60~0.70)');
console.log('='.repeat(94));
console.log('  k   | 反推 base = 实测命中率 / (1 + k − dodge)');
console.log('-'.repeat(60));
for (const g of groups) {
  const implied = means[g.k].rate / (1 + g.k - DODGE);
  console.log(`+${(g.k * 100).toFixed(0)}% |  ${implied.toFixed(3)}`);
}

console.log('\n' + '='.repeat(94));
console.log('结论');
console.log('='.repeat(94));
console.log('• "对某舰种命中率提升" = 该数值作为【加法】塞进命中括号的 + 槽:');
console.log('     final = base × (1 + bonus + 对舰种命中k − 通用闪避 − 武器类别闪避)');
console.log('• 与"dodge 加法"、"直射闪避加法"完全对称: 同一个括号, 加法, 只是符号/作用域不同。');
console.log('• 比值判据(1.23)远离乘法(1.13), 贴近加法(1.25) → 一套公式得证。');
