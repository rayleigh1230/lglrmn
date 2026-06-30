/**
 * 反推"命中下降15%"(全局类策略, 进+槽为−0.15) 的作用方式【修正版】
 *
 * 攻击方: 阋神星级重炮型驱逐, 武器2:
 *   dph315 / 持续0 / 弹药2(每次开火打2发) / 次数1 / 冷却6.6 / 锁定4 / 数量1 / 命中50%-70% / −15%命中
 *   ⚠️ 冷却6.6 已是"缩短40%冷却后"的面板值
 *   实弹(kinetic), 打卡利莱恩(抵抗8) → perHit = 315 − 8 = 307
 *
 * 防御方: 卡利莱恩特种型护卫, 闪避55%, 抵抗8, 结构10418
 *
 * 关键修正: "弹药2"=每次开火打2发 → 每周期2发(不是1发)。
 *   之前用1发反推 base=1.396(不可能>1), 用2发反推 base=0.698 ✓ 落在0.687标定附近。
 *
 * 三种假设(base锚定0.687, dodge=0.55):
 *   A 加法(进+槽, 主假设):  hit = base × (1 − 0.15 − dodge) = base × 0.30
 *   B 乘法:                  hit = base × (1 − dodge) × 0.85 = base × 0.3825
 *   C −15%已在面板区间内:     hit = base × (1 − dodge) = base × 0.45
 *
 * 用法：npx tsx tests/hit-debuff-reverse.ts
 */

function weapon2ShotsAt(time: number): number {
  // 锁定4, 之后每6.6s开火一次, 每次打2发(弹药2)
  let n = 0;
  let t = 4;
  while (t <= time + 1e-6) {
    n += 2;
    t += 6.6;
  }
  return n;
}

function mmss(s: string): number {
  const [m, sec] = s.split(':').map(Number);
  return m * 60 + sec;
}

const PER_HIT = 307;
const obs = [
  ['5:56', 6754],
  ['6:28', 6814],
  ['5:33', 7256],
];

console.log('='.repeat(94));
console.log('反推"命中下降15%"(阋神星武器2, 每次2发) 打卡利莱恩(d55%)【修正弹药2】');
console.log('='.repeat(94));

console.log('\n场次 | 时长  | 秒  | 武器2伤害 | 发数(×2) | 隐含命中数 | 整除? | 隐含命中率');
console.log('-'.repeat(94));
const rates: number[] = [];
for (const [ts, dmg] of obs) {
  const T = mmss(ts);
  const shots = weapon2ShotsAt(T);
  const hits = dmg / PER_HIT;
  const rate = hits / shots;
  rates.push(rate);
  console.log(
    `     |  ${ts}  | ${String(T).padStart(4)} |  ${String(dmg).padStart(5)} |   ${String(shots).padStart(3)}   |  ${hits.toFixed(2).padStart(7)} | ${Number.isInteger(hits) ? '  ✓' : '  ✗'}  | ${(rate * 100).toFixed(2)}%`
  );
}
const meanRate = rates.reduce((a, b) => a + b, 0) / rates.length;

const BASE = 0.687;
const DODGE = 0.55;
const K = 0.15;

console.log('\n' + '='.repeat(94));
console.log('【三种假设的预测命中率】(锚 base=0.687, dodge=0.55)');
console.log('='.repeat(94));
console.log(`实测均值命中率 = ${(meanRate * 100).toFixed(2)}%`);
console.log('');
const A = BASE * (1 - K - DODGE);
const B = BASE * (1 - DODGE) * (1 - K);
const C = BASE * (1 - DODGE);
console.log(`A 加法 base×(1−0.15−0.55)=base×0.30  = ${(A * 100).toFixed(1)}%   ${Math.abs(meanRate - A) < 0.025 ? '✓ 贴近' : '差' + ((meanRate - A) * 100).toFixed(1) + 'pp'}`);
console.log(`B 乘法 base×0.45×0.85 =base×0.3825  = ${(B * 100).toFixed(1)}%   ${Math.abs(meanRate - B) < 0.025 ? '✓ 贴近' : '差' + ((meanRate - B) * 100).toFixed(1) + 'pp'}`);
console.log(`C 区间已含debuff base×0.45         = ${(C * 100).toFixed(1)}%   ${Math.abs(meanRate - C) < 0.025 ? '✓ 贴近' : '差' + ((meanRate - C) * 100).toFixed(1) + 'pp'}`);

console.log('\n' + '='.repeat(94));
console.log('【反推有效 base】(各假设成立时, base应≈0.687 前序标定)');
console.log('='.repeat(94));
console.log(`A 加法: base = 实测/0.30   = ${(meanRate / 0.30).toFixed(3)}  ${Math.abs(meanRate / 0.30 - 0.687) < 0.04 ? '✓ 贴近0.687' : ''}`);
console.log(`B 乘法: base = 实测/0.3825 = ${(meanRate / 0.3825).toFixed(3)}  ${Math.abs(meanRate / 0.3825 - 0.687) < 0.04 ? '✓ 贴近0.687' : ''}`);
console.log(`C 已含: base = 实测/0.45   = ${(meanRate / 0.45).toFixed(3)}  ${Math.abs(meanRate / 0.45 - 0.687) < 0.04 ? '✓ 贴近0.687' : ''}`);

console.log('\n' + '='.repeat(94));
console.log('【比值判据】(黄金标准: 消去 base/perHit/发数)');
console.log('='.repeat(94));
console.log('需要"无−15%词条"的对照组才能算比值。本次无对照组, 但可用前序标定:');
console.log(`  FG300无词条打d55% = 30.9% (base 0.687×0.45)`);
console.log(`  本武器无词条(若base相同)应 ≈ 30.9%`);
console.log(`  实测 = ${(meanRate * 100).toFixed(1)}%`);
console.log(`  实测/基线 = ${(meanRate / (BASE * (1 - DODGE))).toFixed(3)}`);
console.log(`  加法预测比值 0.667, 乘法预测比值 0.850`);
