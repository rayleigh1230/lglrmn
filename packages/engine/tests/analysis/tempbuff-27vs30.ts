/**
 * +27% vs +30% 作为高k档的对比
 */
const HP = 52223, TRIG = 0.60, DODGE_BASE = 0.20, BUFF_DODGE = 0.40, BUFF_DUR = 45, SHIELD = 0.03;
const w1Dps = 525 / 2.7, w2Dps = (28 / 2.1) * 3, total = w1Dps + w2Dps;
const w1F = w1Dps / total, w2F = w2Dps / total;

function sim(nShips: number, k: number, model: 'add' | 'mul') {
  const dps = total * nShips * (1 - SHIELD);
  const h1F = 0.85 * (1 + k - DODGE_BASE), h2F = 0.60 * (1 + k - DODGE_BASE);
  const h1B = model === 'add' ? 0.85 * (1 + k - DODGE_BASE - BUFF_DODGE) : 0.85 * (1 + k - DODGE_BASE) * (1 - BUFF_DODGE);
  const h2B = model === 'add' ? 0.60 * (1 + k - DODGE_BASE - BUFF_DODGE) : 0.60 * (1 + k - DODGE_BASE) * (1 - BUFF_DODGE);
  const dF = dps * (w1F * h1F + w2F * h2F);
  const dB = dps * (w1F * h1B + w2F * h2B);
  const hpF = HP * (1 - TRIG), hpB = HP * TRIG;
  const T1 = hpF / dF;
  const dmgBuff = dB * BUFF_DUR;
  let T2, hpLeft;
  if (dmgBuff >= hpB) { T2 = hpB / dB; hpLeft = 0; } else { T2 = BUFF_DUR; hpLeft = hpB - dmgBuff; }
  const T3 = hpLeft > 0 ? hpLeft / dF : 0;
  return T1 + T2 + T3;
}

console.log('='.repeat(78));
console.log('+27% vs +30% 作为高k档的对比 (10艘斗牛, 配+0%低档)');
console.log('='.repeat(78));
console.log('');
console.log('高k档 | 加法T | 乘法T | 单档差 | 跨度T(0%)−T(高k)加法 | 跨度乘法 | 跨度差');
console.log('-'.repeat(78));

const T0add = sim(10, 0, 'add'), T0mul = sim(10, 0, 'mul');

for (const k of [0.24, 0.27, 0.30]) {
  const Ta = sim(10, k, 'add'), Tm = sim(10, k, 'mul');
  const spanA = T0add - Ta, spanM = T0mul - Tm;
  console.log(
    `+${(k * 100).toFixed(0)}% | ${Ta.toFixed(0)}s  | ${Tm.toFixed(0)}s  | ${(Ta - Tm).toFixed(1)}s  |     ${spanA.toFixed(0)}s            |   ${spanM.toFixed(0)}s    |  ${(spanA - spanM).toFixed(1)}s`
  );
}

console.log('');
console.log('+0%档参考: 加法T=' + T0add.toFixed(0) + 's, 乘法T=' + T0mul.toFixed(0) + 's');
console.log('');
console.log('结论:');
console.log('• +27% 和 +30% 跨度差几乎相同(都≈8s), 判别力一致');
console.log('• +30% 单档差略大(绝对时长更短, 信号略强)');
console.log('• 两者都可用, 选哪个不影响结论');
