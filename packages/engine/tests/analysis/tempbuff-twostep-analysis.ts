/**
 * +0% 与 +30% 两档完整对比 —— 跨度判据 + 触发时刻对照
 *
 * 实测:
 *   +0%档: 5场, 3场75s/2场74s, 均值74.5s, 进入60%区间~20s
 *   +30%档: 4场, 全部52s, 进入60%区间~20s
 *
 * 关键观察: 两档"进入60%区间"都是~20s!
 *   → 前段(40%血)时长几乎相同, 与命中加成无关?
 *   → 但这很反常: +30%命中应该让前段掉血更快, 前段应该更短
 *
 * 重新审视: 前20s发生了什么?
 *   +0%: 前20s打掉40%血(20889HP)
 *   +30%: 前20s打掉40%血(20889HP)
 *   → 两档前段DPS相同? 但命中加成应该不同...
 *
 * 假设检验: 也许前段命中率已经被某种因素"封顶"?
 *   武器1对驱逐70-100%, +30%命中 → 1.0+ 可能撞95%上限!
 *   武器1中值0.85, +0%k → 0.85×(1−0.20)=0.68
 *   武器1中值0.85, +30%k → 0.85×(1.30−0.20)=0.935, 接近95%上限!
 *   → +30%档前段命中率被95%上限压制!
 *
 * 这能解释两档前段时长相同(都被上限压), 但后段不同(buff窗命中率低, 不撞上限)
 */
const HP = 52223, TRIG = 0.60, DODGE = 0.20, BUFF_DODGE = 0.40, BUFF_DUR = 45, SHIELD = 0.03;
const CEIL = 0.95;
const w1Dps = 525 / 2.7, w2Dps = (28 / 2.1) * 3, total = w1Dps + w2Dps;
const w1F = w1Dps / total, w2F = w2Dps / total;
const nShips = 10;
const dpsEff = total * nShips * (1 - SHIELD);

function hitClamped(h: number) { return Math.min(Math.max(h, 0.10), CEIL); }

console.log('='.repeat(85));
console.log('关键检验: 前段命中率是否撞95%上限?');
console.log('='.repeat(85));
for (const k of [0, 0.30]) {
  const h1 = 0.85 * (1 + k - DODGE);  // 武器1
  const h2 = 0.60 * (1 + k - DODGE);  // 武器2
  const h1c = hitClamped(h1);
  console.log(`+${k * 100}%命中: 武器1前段hit = ${h1.toFixed(3)} ${h1 >= CEIL ? '→撞95%上限!' : ''}`);
  console.log(`           武器1(夹后) = ${h1c.toFixed(3)}`);
  console.log(`           武器2前段hit = ${h2.toFixed(3)} (不撞)`);
}

console.log('\n' + '='.repeat(85));
console.log('两档的【前段】和【后段】分别反推(用实测触发时刻20s)');
console.log('='.repeat(85));
console.log('公式: 命中率 = HP段 / (有效DPS × 段时长)');
console.log('');

const T_front_obs = 20;
const hpFront = HP * (1 - TRIG);
const hpBack = HP * TRIG;
const hitFront_implied = hpFront / (dpsEff * T_front_obs);

console.log(`前段(两档都用20s): 反推命中率 = ${(hitFront_implied * 100).toFixed(1)}%`);
console.log(`  武器1+0%预测(不撞): ${(0.85*(1-DODGE)*100).toFixed(1)}%, 武器1+30%预测(不撞): ${(0.85*(1.30-DODGE)*100).toFixed(1)}%→撞上限`);
console.log(`  → 两档都撞/接近上限, 反推值是夹后的混合命中率\n`);

console.log('档位 | 实测T | 前段T | 后段T | 反推后段hit | 加法预测 | 乘法预测 | 贴谁?');
console.log('-'.repeat(85));
const data = [
  { k: 0, T: 74.5 },
  { k: 0.30, T: 52 },
];
const hitBack_add = (k: number) => hitClamped(0.85 * (1 + k - DODGE - BUFF_DODGE)) * w1F + hitClamped(0.60 * (1 + k - DODGE - BUFF_DODGE)) * w2F;
const hitBack_mul = (k: number) => hitClamped(0.85 * (1 + k - DODGE) * (1 - BUFF_DODGE)) * w1F + hitClamped(0.60 * (1 + k - DODGE) * (1 - BUFF_DODGE)) * w2F;

for (const d of data) {
  const Tback = d.T - T_front_obs;
  const hitBack = hpBack / (dpsEff * Tback);
  const ha = hitBack_add(d.k);
  const hm = hitBack_mul(d.k);
  const closer = Math.abs(hitBack - ha) < Math.abs(hitBack - hm) ? '加法' : '乘法';
  console.log(`+${(d.k * 100).toFixed(0)}% | ${d.T}s  | ${T_front_obs}s  | ${Tback.toFixed(0)}s  |   ${(hitBack * 100).toFixed(1)}%   |  ${(ha * 100).toFixed(1)}%  |  ${(hm * 100).toFixed(1)}%  | ${closer}`);
}

console.log('\n' + '='.repeat(85));
console.log('跨度判据(消去前段20s的公共部分)');
console.log('='.repeat(85));
const span_obs = 74.5 - 52;
console.log(`实测跨度 T(+0%)−T(+30%) = ${span_obs}s`);
console.log(`  加法预测: 后段时长差 = ${(hpBack / (dpsEff * hitBack_add(0))).toFixed(0)} − ${(hpBack / (dpsEff * hitBack_add(0.30))).toFixed(0)} = ${(hpBack / (dpsEff * hitBack_add(0))) - (hpBack / (dpsEff * hitBack_add(0.30)))}s`);
console.log(`  乘法预测: 后段时长差 = ${(hpBack / (dpsEff * hitBack_mul(0))).toFixed(0)} − ${(hpBack / (dpsEff * hitBack_mul(0.30))).toFixed(0)} = ${(hpBack / (dpsEff * hitBack_mul(0))) - (hpBack / (dpsEff * hitBack_mul(0.30)))}s`);

console.log('\n' + '='.repeat(85));
console.log('【意外强判据】: +30%档4场全52s零散布');
console.log('='.repeat(85));
console.log('+0%档有74/75散布(后段RNG), 但+30%档4场全52s');
console.log('→ +30%档后段命中率可能撞【10%下限】, 离散被压平');
console.log('');
const hitBack_add_30 = hitClamped(0.85 * (1 + 0.30 - DODGE - BUFF_DODGE)) * w1F + hitClamped(0.60 * (1 + 0.30 - DODGE - BUFF_DODGE)) * w2F;
const hitBack_mul_30 = hitClamped(0.85 * (1 + 0.30 - DODGE) * (1 - BUFF_DODGE)) * w1F + hitClamped(0.60 * (1 + 0.30 - DODGE) * (1 - BUFF_DODGE)) * w2F;
console.log(`+30%档后段(加法): 武器1=${(0.85*(1+0.30-DODGE-BUFF_DODGE)).toFixed(3)}, 武器2=${(0.60*(1+0.30-DODGE-BUFF_DODGE)).toFixed(3)}`);
console.log(`  武器2 = 0.60×0.50 = 0.30, 不撞底`);
console.log(`  加权 = ${(hitBack_add_30*100).toFixed(1)}%`);
console.log(`+30%档后段(乘法): 武器1=${(0.85*(1.30-DODGE)*(1-BUFF_DODGE)).toFixed(3)}, 武器2=${(0.60*(1.30-DODGE)*(1-BUFF_DODGE)).toFixed(3)}`);
console.log(`  加权 = ${(hitBack_mul_30*100).toFixed(1)}%`);
