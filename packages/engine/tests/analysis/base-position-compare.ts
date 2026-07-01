/**
 * 两个场景的 base 标准化对比 —— 解开"下限 vs 中值"矛盾
 *
 * 关键新数据（2026-07-01 用户确认）：
 *   斗牛主武器命中区间 70%-100%（下限0.70/中值0.85/上限1.00）
 *   斗牛副武器命中区间 50%-70%（下限0.50/中值0.60/上限0.70）
 *   康纳马拉轨道炮命中区间 50%-70%（下限0.50/中值0.60/上限0.70）
 *
 * 也就是说：斗牛副武器和轨道炮的命中区间【完全相同】(50%-70%)！
 * 这是绝佳的对照——同区间，不同武器，看base是否落在同一位置。
 *
 * 【反推值】
 *   斗牛场景（10斗牛打靶，干净+0%档反推）：最佳主base≈0.65，副base未知
 *   轨道炮场景（8/6/4/2打航母，+0%档反推）：base≈0.616
 *
 * 标准化方法：把反推值映射到"在区间内的相对位置" 0=下限，1=上限
 *   相对位置 = (反推值 − 下限) / (上限 − 下限)
 *
 * 用法：npx tsx tests/analysis/base-position-compare.ts
 */

interface Scene {
  name: string;
  weapon: string;
  rangeMin: number;
  rangeMax: number;
  inferredBase: number;
}

const scenes: Scene[] = [
  {
    name: '斗牛主武器',
    weapon: '主炮(打大)',
    rangeMin: 0.70,
    rangeMax: 1.00,
    inferredBase: 0.65, // 但0.65 < 下限0.70！说明反推值可能受其他因素影响
  },
  {
    name: '康纳马拉轨道炮',
    weapon: '轨道炮(打大)',
    rangeMin: 0.50,
    rangeMax: 0.70,
    inferredBase: 0.616,
  },
];

console.log('='.repeat(78));
console.log('两场景 base 标准化位置对比');
console.log('='.repeat(78));
console.log('相对位置: 0=区间下限, 0.5=中值, 1=区间上限\n');
console.log('  场景          | 区间       | 反推base | 相对位置 | 落点');
console.log('  ' + '-'.repeat(70));
for (const s of scenes) {
  const pos = (s.inferredBase - s.rangeMin) / (s.rangeMax - s.rangeMin);
  let label: string;
  if (pos < 0) label = '低于下限!';
  else if (pos < 0.25) label = '接近下限';
  else if (pos < 0.4) label = '下限~1/3位';
  else if (pos < 0.6) label = '中值附近';
  else if (pos < 0.75) label = '中值~2/3位';
  else label = '接近上限';
  console.log(`  ${s.name.padEnd(14)} | ${(s.rangeMin*100).toFixed(0)}%-${(s.rangeMax*100).toFixed(0)}%    | ${s.inferredBase.toFixed(3)}  |  ${pos.toFixed(3)}  | ${label}`);
}

console.log('\n' + '='.repeat(78));
console.log('【关键发现：斗牛反推base=0.65 低于其区间下限0.70！】');
console.log('='.repeat(78));
console.log('斗牛主武器区间 70%-100%，下限0.70。');
console.log('但干净+0%档反推最佳base=0.65，比下限还低5pp。');
console.log('这在物理上不可能(base不能低于面板区间下限)。');
console.log('');
console.log('说明：斗牛场景的0.65不是"真实base"，而是【含其他减速因素的等效值】。');
console.log('可能的减速因素：');
console.log('  1. 副武器(base未知，若副武器贡献被高估，主武器需更低来补偿)');
console.log('  2. +30%衰减效应残余(但+0%档应该没有)');
console.log('  3. 斗牛的命中区间标定与轨道炮不同(斗牛打的是护卫舰级靶,轨道炮打航母)');

console.log('\n' + '='.repeat(78));
console.log('【对照实验：同区间50%-70%的两把武器】');
console.log('='.repeat(78));
console.log('斗牛副武器：区间50%-70%（与轨道炮同区间！）');
console.log('轨道炮：区间50%-70%，反推base=0.616');
console.log('');
console.log('如果能拿到"10斗牛打靶"场景里副武器的实际贡献，');
console.log('就能反推副武器base，与轨道炮(同区间)直接对比。');
console.log('但昨晚斗牛数据只记录了总时长，没分主/副武器伤害。');
console.log('→ 这是斗牛数据的关键缺陷：无法分离主/副武器贡献。');

console.log('\n' + '='.repeat(78));
console.log('【结论：两个场景的矛盾来源】');
console.log('='.repeat(78));
console.log('矛盾表现：斗牛base≈下限(0.65~0.70)，轨道炮base≈中值(0.616)');
console.log('');
console.log('根因分析：');
console.log('  • 轨道炮场景是【单武器】(武器2黑箱贡献极小3584/370192≈1%)，反推干净');
console.log('  • 斗牛场景是【主+副双武器】，且副武器贡献未分离，');
console.log('    主base反推受"副武器实际命中率"这个未知量的污染');
console.log('  • 斗牛反推主base=0.65 < 区间下限0.70 → 反推本身不自洽 → 副武器污染确认');
console.log('');
console.log('→ 轨道炮场景(0.616)的可信度 > 斗牛场景(0.65)');
console.log('→ "base≈中值"的结论以轨道炮为准，斗牛的"下限"是副武器污染导致的假象');
console.log('→ 但要最终确认，需要一个"纯主武器、无副武器污染"的斗牛场景，');
console.log('  或在轨道炮场景分离出副武器(武器2)的真实贡献');
