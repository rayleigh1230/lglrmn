/**
 * 临时buff测试 —— 场次分配优化
 *
 * 问题: 各档两假设差不同, 单场散布±4s, 如何分配9场(或更多)最有效?
 *
 * 各档判别力:
 *   +0%:  两假设差7s  → 单场信噪比 7/4=1.75, 3场均值散布±2.3s, 信噪比3 ✓
 *   +15%: 两假设差1s  → 单场信噪比 1/4=0.25, 需16场才到信噪比1 ✗极弱
 *   +27%: 两假设差1s  → 同上 ✗极弱
 *
 * 结论: +15%/+27%单档几乎不可辨, 但【符号反转】是二值信号, 只需定方向
 */
const diff = { '0%': 7, '15%': 1, '27%': 1 };
const noise = 4; // 单场散布±4s

console.log('='.repeat(80));
console.log('各档判别力 vs 单场散布');
console.log('='.repeat(80));
console.log('档位 | 两假设差 | 单场信噪比 | N场达信噪比3所需 | 实际可行性');
console.log('-'.repeat(80));
for (const [k, d] of Object.entries(diff)) {
  const snr1 = d / noise;
  const N = Math.ceil((3 / snr1) ** 2);
  console.log(`+${k.padStart(3)} |   ${d}s    |    ${snr1.toFixed(2)}    |      ${N}场        | ${N <= 3 ? '✓可行' : N <= 9 ? '~多场' : '✗不现实'}`);
}

console.log('\n' + '='.repeat(80));
console.log('优化方案: 重分配场次到信号最强的档');
console.log('='.repeat(80));
console.log('• +0%档(差7s): 主力, 测5场 → 均值散布±1.8s, 信噪比3.9 ✓强');
console.log('• +27%档(差1s): 符号反转验证, 测4场 → 均值散布±2s');
console.log('  但+27%档差只有1s, 4场不够辨方向...');
console.log('');
console.log('重新思考: 符号反转的判据不是"+27%档内部辨",');
console.log('而是【+0%档均值 vs +27%档均值的相对关系】:');
console.log('  加法: T(0%)−T(27%) = 57−36 = 21s');
console.log('  乘法: T(0%)−T(27%) = 50−37 = 13s');
console.log('  两假设对这个【跨度】的预测差 8s!');
console.log('');
console.log('跨度判据: 测+0%和+27%两档, 看 T(0%)−T(27%) 是≈21s(加法)还是≈13s(乘法)');
