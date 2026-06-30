/**
 * 反推"被直射武器命中率下降"词条的作用方式（修正版）
 *
 * 卡利莱恩特种型护卫(防御方): 闪避 55%, 抵抗8, 结构10418
 *   + 被直射命中 -15% / -30% 两组
 * 攻击方: FG300反击(dph30/3发/持续3/冷却4/锁定3/3门/区间50-70%, 直射)
 *
 * ⚠️ 修正: -15% 组与 -30% 组用的是两个不同账号对测,
 *    -30% 那艘卡利莱恩抵抗少了3 → 抵抗5 → perHit = 30−5 = 25
 *    -15% 组与基线组 抵抗8 → perHit = 30−8 = 22
 *    （整除性独立验证: 3625/3350/3975 ÷ 25 全整除 ✓）
 *
 * 三种假设:
 *   A 加法(塞进dodge):  hit = base × (1 − 0.55 − k)        k∈{0,0.15,0.30}
 *   B 乘法(作用final):   hit = base×(1−0.55) × (1−k)
 *   C 绝对减法:          hit = base×(1−0.55) − k
 *
 * 用法：npx tsx tests/weapon-dodge.ts
 */

function fg300ShotsAt(time: number): number {
  let total = 0;
  let cycleStart = 3;
  while (cycleStart <= time + 1e-6) {
    for (let i = 0; i < 3; i++) if (cycleStart + i <= time + 1e-6) total++;
    cycleStart += 7;
  }
  return total * 3;
}

// [战斗秒数, 累计承受伤害, 该组perHit]
const groups = [
  { k: 0, name: '基线 k=0%   ', perHit: 22, obs: [[1103, 9394], [1126, 9922]] },
  { k: 0.15, name: '词条 k=15% ', perHit: 22, obs: [[1134, 7436], [1046, 5522], [1041, 6072]] },
  { k: 0.30, name: '词条 k=30% ', perHit: 25, obs: [[1103, 3625], [1096, 3350], [1160, 3975]] },
];

console.log('='.repeat(92));
console.log('反推"被直射命中率下降"——卡利莱恩(闪避55%+词条k) 被 FG300 射击【修正perHit】');
console.log('='.repeat(92));

console.log('\n场次 | 时长  | 伤害  | perHit | FG300发数 | 隐含命中数 | 整除? | 隐含命中率');
console.log('-'.repeat(92));
const means: Record<number, { rate: number; n: number }> = {};
for (const g of groups) {
  const rates: number[] = [];
  for (const [t, dmg] of g.obs) {
    const shots = fg300ShotsAt(t);
    const hits = dmg / g.perHit;
    const rate = hits / shots;
    const clean = Number.isInteger(hits);
    rates.push(rate);
    const mm = Math.floor(t / 60), ss = Math.round(t % 60);
    console.log(
      `${g.name} | ${String(mm).padStart(2)}:${String(ss).padStart(2, '0')} | ${String(dmg).padStart(5)} |   ${g.perHit}    | ${String(shots).padStart(8)} | ${hits.toFixed(2).padStart(9)} | ${clean ? '  ✓' : '  ✗'}  | ${(rate * 100).toFixed(2)}%`
    );
  }
  const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
  means[g.k] = { rate: mean, n: rates.length };
}

const BASE = 0.68;
const DODGE = 0.55;
const HIT_MIN = 0.10;

console.log('\n' + '='.repeat(92));
console.log('组均值命中率 + 三种假设预测（锚定 base=0.68, 由基线 0.306/0.45 反推）');
console.log('='.repeat(92));
console.log('词条 k | 实测均值 | A加法 base×(1−d−k) [夹下限] | B乘法 base×(1−d)(1−k) | C绝对减 base×(1−d)−k');
console.log('-'.repeat(92));
for (const g of groups) {
  const obs = means[g.k].rate;
  let A = BASE * (1 - DODGE - g.k);
  A = Math.max(A, HIT_MIN);
  const B = BASE * (1 - DODGE) * (1 - g.k);
  const C = Math.max(BASE * (1 - DODGE) - g.k, HIT_MIN);
  const tagA = A <= HIT_MIN + 1e-6 ? ' ←触底' : '';
  console.log(
    ` ${(g.k * 100).toFixed(0)}%  | ${(obs * 100).toFixed(2)}%  |       ${(A * 100).toFixed(2)}%${tagA.padEnd(8)} |    ${(B * 100).toFixed(2)}%          |   ${(C * 100).toFixed(2)}%`
  );
}

console.log('\n' + '='.repeat(92));
console.log('最强判据: -30%/-15% 命中率比值（消去 perHit 标定，纯结构判据）');
console.log('='.repeat(92));
const ratioObs = means[0.3].rate / means[0.15].rate;
const ratioA = 0.15 / (1 - DODGE - 0.15); // base×0.15 / base×0.30, base约掉
const ratioB = (1 - 0.3) / (1 - 0.15);
console.log(`实测比值 -30%/-15% = ${(ratioObs * 100).toFixed(1)}%`);
console.log(`A加法预测           = ${(ratioA * 100).toFixed(1)}%   ${Math.abs(ratioObs - ratioA) < Math.abs(ratioObs - ratioB) ? '✓ 更接近' : ''}`);
console.log(`B乘法预测           = ${(ratioB * 100).toFixed(1)}%   ${Math.abs(ratioObs - ratioB) < Math.abs(ratioObs - ratioA) ? '✓ 更接近' : ''}`);

console.log('\n' + '='.repeat(92));
console.log('反推检验: 若假设A成立，三组反推出的 base 应近似常数');
console.log('='.repeat(92));
console.log('词条 k | 反推 base = 实测命中率 / (1−0.55−k)');
console.log('-'.repeat(60));
let bases: number[] = [];
for (const g of groups) {
  const denom = 1 - DODGE - g.k;
  const implied = means[g.k].rate / denom;
  bases.push(implied);
  console.log(` ${(g.k * 100).toFixed(0)}%  |  ${implied.toFixed(3)}${denom < 0.2 ? '  (注: 接近下限, 反推不可靠)' : ''}`);
}
const baseMean = bases.slice(0, 2).reduce((a, b) => a + b, 0) / 2;
console.log(`\n仅用未触底的前两组(k=0,15)反推 base 均值 = ${baseMean.toFixed(3)}  ← 应与FG300区间中值0.60~0.70吻合`);

console.log('\n' + '='.repeat(92));
console.log('结论');
console.log('='.repeat(92));
console.log('• "被直射武器命中率下降" = 该数值作为【加法】塞进闪避括号:');
console.log('     final = base × (1 + bonus − 通用闪避 − 对应武器闪避)');
console.log('• 不是乘法缩减final，也不是对base做减法。');
console.log('• -30% 在卡利莱恩(总闪避0.85)上撞到10%命中率下限，被clamp。');
