/**
 * 测试"命中下降15%"(全局类, 进+槽为−0.15)用什么靶: 高闪避 vs 低闪避?
 *
 * 关键认知(反复出现的核心原则):
 *   - 词条落在 −槽(dodge侧) → 高闪避把命中率推向【下限饱和】, 信号被夹没
 *   - 词条落在 +槽(bonus侧) → 高闪避【放大】加法/乘法的判别差, 信号增强(只要不触底)
 *
 * "命中下降15%"是【自身武器】的命中debuff → 落在 +槽 为 −0.15。
 *   加法:  final = base × (1 − 0.15 − dodge)
 *   乘法:  final = base × (1 − dodge) × (1 − 0.15)
 *   两式差 = base × dodge × 0.15  → 与 dodge 成正比! 高闪避=大信号
 *
 * 用法：npx tsx tests/hit-debuff-target.ts
 */
const BASE = 0.687;
const FLOOR = 0.10;
const K = 0.15; // 命中下降15%
const add = (d: number) => Math.max(BASE * (1 - K - d), FLOOR);
const mul = (d: number) => Math.max(BASE * (1 - d) * (1 - K), FLOOR);
const hit0 = (d: number) => Math.max(BASE * (1 - d), FLOOR); // 无词条基线

console.log('='.repeat(90));
console.log('"命中下降15%"(进+槽为−0.15): 高闪避靶 vs 低闪避靶 的判别力对比');
console.log('='.repeat(90));
console.log('\n核心公式差 = base × dodge × k  → 与靶的 dodge 成正比');
console.log('');
console.log('靶子          | dodge | 基线hit | 加法hit | 乘法hit | 绝对差 | 触底? | 比值判据(加/乘)');
console.log('-'.repeat(90));
const targets = [
  ['卡利莱恩(高闪避)', 0.55],
  ['中等闪避', 0.30],
  ['斗牛(低闪避)', 0.08],
  ['无闪避', 0.00],
];
for (const [name, d] of targets) {
  const h0 = hit0(d);
  const a = add(d);
  const m = mul(d);
  const diff = (a - m) * 100;
  const floored = a <= FLOOR + 1e-9;
  const ratioA = a / h0;
  const ratioM = m / h0;
  console.log(
    `${name.padEnd(16)} | ${(d * 100).toFixed(0)}%  | ${(h0 * 100).toFixed(1)}% |  ${(a * 100).toFixed(1)}% |  ${(m * 100).toFixed(1)}% | ${diff.toFixed(1)}pp |  ${floored ? '是' : '否 '}  | ${ratioA.toFixed(3)} / ${ratioM.toFixed(3)}`
  );
}

console.log('\n' + '='.repeat(90));
console.log('【比值判据】(黄金标准: 消去 base/perHit/发数标定)');
console.log('='.repeat(90));
console.log('  加法: hit(−15%)/hit(0) = (1−0.15−d)/(1−d)');
console.log('  乘法: hit(−15%)/hit(0) = 0.85 (恒定, 与dodge无关)');
console.log('');
for (const [name, d] of targets) {
  const ratioA = (1 - K - d) / (1 - d);
  const ratioM = 0.85;
  const sep = Math.abs(ratioA - ratioM);
  const verdict = sep > 0.1 ? '✓ 易辨' : sep > 0.03 ? '~ 边缘' : '✗ 难辨';
  console.log(`  ${name.padEnd(16)} (d=${(d * 100).toFixed(0)}%): 加法比值=${ratioA.toFixed(3)}, 乘法比值=${ratioM.toFixed(3)}, 差=${sep.toFixed(3)}  ${verdict}`);
}

console.log('\n' + '='.repeat(90));
console.log('结论');
console.log('='.repeat(90));
console.log('• 用【高闪避靶 卡利莱恩 d55%】: 加法20.6% vs 乘法26.3%, 差5.7pp, 不触底, 一测即辨。');
console.log('• 比值判据: 加法0.667 vs 乘法0.850, 差0.183 → 极易分辨。');
console.log('• 低闪避靶(d8%): 差仅0.8pp, 比值差0.013 → 噪声内, 测不出。');
console.log('• 且卡利莱恩复用全部已有标定(base=0.687, 抵抗8→perHit=22), 零额外成本。');
console.log('');
console.log('⚠️ 这与"武器类别闪避"测试相反: 那个落−槽怕高闪避饱和, 这个落+槽要高闪避放大。');
console.log('   判别准则: 看词条进哪个槽 —— −槽用低闪避靶, +槽用高闪避靶。');
