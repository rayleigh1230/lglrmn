/**
 * 临时buff测试 —— 命中加成3%步长可调, 扫曲线定公式
 *
 * 关键升级: 命中加成可在0-30%间以3%步长调节(0/3/6/9/12/15/18/21/24/27/30)
 *   → 能扫一条【整场平均命中率 vs 命中加成】的曲线
 *   → 加法/乘法给出的曲线【形状不同】, 多点拟合比两点对比强得多
 *
 * 判据升级:
 *   旧(两点): 看符号反转 → 已强
 *   新(曲线): 看整条曲线斜率/曲率 → 加法是分段线性, 乘法是另一形态
 *
 * 核心物理:
 *   加法: final = base×(1 + k − dodge), k是命中加成
 *     - 前段hit = base×(1+k−0.20), 随k线性
 *     - buff窗hit = base×(1+k−0.60), 随k线性但更陡(因更接近下限, k的边际效应大)
 *   乘法: final = base×(1+k)×(1−dodge)  ← 注意! 命中加成是乘在(1+k)上还是加进括号?
 *
 * ⚠️ 这里有个关键歧义必须先厘清:
 *   "命中率提升30%" 是 (a) 进+槽 base×(1+0.30−dodge) 还是 (b) 乘法 base×(1−dodge)×1.30?
 *   实验2(对舰种命中)已证是(a)加法进槽! 所以这里的"+30%命中"也是加法进+槽。
 *   那么"临时buff乘法"指的是【闪避buff】乘法, 不是命中加成乘法。
 *
 * 重新明确本次要测的假设:
 *   主假设A: 临时闪避buff进−槽为加法  final = base×(1+k−dodge−buffDodge)
 *   备选B: 临时闪避buff是乘法        final = base×(1+k−dodge)×(1−buffDodge)
 *   (命中加成k在两个假设里都是加法进+槽, 已由实验2证明)
 *
 * 用法：npx tsx tests/tempbuff-sweep.ts
 */
const HP = 52223;
const TRIG = 0.60;
const DODGE_BASE = 0.20;
const BUFF_DODGE = 0.40;
const BUFF_DUR = 45;
const SHIELD = 0.03;

const w1Dps = 525 / 2.7;
const w2Dps = (28 / 2.1) * 3;
const durvsTotal = w1Dps + w2Dps;
const w1Frac = w1Dps / durvsTotal;
const w2Frac = w2Dps / durvsTotal;

function simulate(totalDpsPerSec: number, hitBonus: number, model: 'add' | 'mul') {
  const f = 1 - SHIELD;
  // 命中加成k: 加法进+槽(实验2已证)
  const h1Front = 0.85 * (1 + hitBonus - DODGE_BASE);
  const h2Front = 0.60 * (1 + hitBonus - DODGE_BASE);
  // 闪避buff: 加法(A) vs 乘法(B) —— 这是本次要测的!
  const h1Buff = model === 'add' ? 0.85 * (1 + hitBonus - DODGE_BASE - BUFF_DODGE) : 0.85 * (1 + hitBonus - DODGE_BASE) * (1 - BUFF_DODGE);
  const h2Buff = model === 'add' ? 0.60 * (1 + hitBonus - DODGE_BASE - BUFF_DODGE) : 0.60 * (1 + hitBonus - DODGE_BASE) * (1 - BUFF_DODGE);
  const dpsFront = totalDpsPerSec * f * (w1Frac * h1Front + w2Frac * h2Front);
  const dpsBuff = totalDpsPerSec * f * (w1Frac * h1Buff + w2Frac * h2Buff);
  const hpFront = HP * (1 - TRIG);
  const hpBack = HP * TRIG;
  const T1 = hpFront / dpsFront;
  const dmgInBuff = dpsBuff * BUFF_DUR;
  let T2: number, hpLeft: number;
  if (dmgInBuff >= hpBack) { T2 = hpBack / dpsBuff; hpLeft = 0; }
  else { T2 = BUFF_DUR; hpLeft = hpBack - dmgInBuff; }
  const T3 = hpLeft > 0 ? hpLeft / dpsFront : 0;
  return { T_total: T1 + T2 + T3, diedInBuff: hpLeft === 0 };
}

console.log('='.repeat(95));
console.log('临时buff测试: 命中加成3%步长扫描 —— 找信号最强的档位组合');
console.log('='.repeat(95));
console.log('要测: 临时闪避buff是【加法进−槽】(A) 还是【乘法】(B)');
console.log('命中加成k确定是加法进+槽(实验2已证), 在两假设中相同');
console.log('');

// 扫描不同集火规模下, 各命中加成档的信号差
for (const nShips of [6, 8, 10]) {
  const totalDps = durvsTotal * nShips;
  console.log(`\n【${nShips}艘斗牛, 总DPS ${Math.round(totalDps * 60)}/分钟】`);
  console.log('命中加成k | 加法T | 乘法T | T差 | 加法均命中 | 乘法均命中 | 信号差 | 评价');
  console.log('-'.repeat(92));
  for (let k = 0; k <= 0.30; k += 0.03) {
    const ra = simulate(totalDps, k, 'add');
    const rm = simulate(totalDps, k, 'mul');
    const tGap = ra.T_total - rm.T_total;
    const avgAdd = HP / (totalDps * (1 - SHIELD) * ra.T_total);
    const avgMul = HP / (totalDps * (1 - SHIELD) * rm.T_total);
    const hGap = (avgMul - avgAdd) * 100;
    const mark = Math.abs(hGap) > 3 ? '✓强' : Math.abs(hGap) > 2 ? '~可' : '✗弱';
    console.log(`  +${(k * 100).toFixed(0).padStart(2)}%   | ${ra.T_total.toFixed(0).padStart(3)}s | ${rm.T_total.toFixed(0).padStart(3)}s | ${tGap.toFixed(1).padStart(4)}s |   ${(avgAdd * 100).toFixed(1)}%    |   ${(avgMul * 100).toFixed(1)}%    | ${hGap.toFixed(1).padStart(5)}pp | ${mark}`);
  }
}

console.log('\n' + '='.repeat(95));
console.log('关键观察: 信号差随k变化的曲线形状');
console.log('='.repeat(95));
console.log('找【信号差绝对值】最大的k档, 且【符号】提供额外信息:');
console.log('  - k小(0-12%): 加法命中<乘法 → 信号为正(加法更慢)');
  console.log('  - k大(18-30%): 反转 → 信号为负(加法更快, 因buff窗被k拉离下限)');
console.log('  - 中间(~15%): 死区, 信号≈0');
console.log('');
console.log('策略: 测【低k档+高k档】两端, 用符号反转做交叉验证, 避开死区');

console.log('\n' + '='.repeat(95));
console.log('最优测试方案: 选信号最强的2-3个档');
console.log('='.repeat(95));

// 找每个集火规模下, |信号差|最大的两个k档(一正一负)
for (const nShips of [8, 10]) {
  const totalDps = durvsTotal * nShips;
  console.log(`\n【${nShips}艘斗牛】最优档位:`);
  const results: { k: number; hGap: number; T_add: number; T_mul: number }[] = [];
  for (let k = 0; k <= 0.30; k += 0.03) {
    const ra = simulate(totalDps, k, 'add');
    const rm = simulate(totalDps, k, 'mul');
    const avgAdd = HP / (totalDps * (1 - SHIELD) * ra.T_total);
    const avgMul = HP / (totalDps * (1 - SHIELD) * rm.T_total);
    results.push({ k, hGap: (avgMul - avgAdd) * 100, T_add: ra.T_total, T_mul: rm.T_total });
  }
  // 最大正信号(低k)和最大负信号(高k)
  const posBest = results.filter(r => r.hGap > 0).sort((a, b) => b.hGap - a.hGap)[0];
  const negBest = results.filter(r => r.hGap < 0).sort((a, b) => a.hGap - b.hGap)[0];
  console.log(`  低k档(正信号): +${(posBest.k * 100).toFixed(0)}% → 信号${posBest.hGap.toFixed(1)}pp, 加法T=${posBest.T_add.toFixed(0)}s/乘法T=${posBest.T_mul.toFixed(0)}s`);
  console.log(`  高k档(负信号): +${(negBest.k * 100).toFixed(0)}% → 信号${negBest.hGap.toFixed(1)}pp, 加法T=${negBest.T_add.toFixed(0)}s/乘法T=${negBest.T_mul.toFixed(0)}s`);
  console.log(`  → 测这两档, 若符号方向与预测一致 → 公式定性; 不一致 → 推翻假设`);
}
