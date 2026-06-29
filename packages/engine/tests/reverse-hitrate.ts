/**
 * 统一反推:从6场景实测反推每个武器的真实命中率
 *
 * 方法:对每个场景,假设伤害公式全对(实弹减法/能量全额),
 *      用实测时长+伤害反推"实际命中率",再和"面板公式命中率"对比。
 *      看哪个武器系统性偏离 → 找到问题根源。
 *
 * FG300反击(固定武器):dph30/3发/持续3s/冷却4/锁定3/3门/区间50-70%
 *   对驱逐舰/护卫舰:保底3/发(抵抗≥30时) 或 dph30−抵抗(抵抗<30时)
 *
 * 用法：npx tsx tests/reverse-hitrate.ts
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

console.log('='.repeat(85));
console.log('统一反推:从实测反推FG300反击的真实命中率(消除弹药/护盾等干扰)');
console.log('FG300反击固定:3门×(dph30/3发/持续3s/冷却4/锁定3), 区间50-70%');
console.log('='.repeat(85));

// 各场景:闪避, 抵抗, 实测[时长,伤害][]
const scenarios = [
  { name: '1.驱逐舰', dodge: 0.25, resistance: 36, perHit: 3,
    obs: [[322,591],[322,579],[323,573],[322,579],[322,669],[291,567],[270,531],[322,633],[270,564],[291,546],[323,648],[322,678]] },
  { name: '2.亚达伯拉', dodge: 0.0, resistance: 45, perHit: 3,
    obs: [[232,567],[253,660],[294,735],[232,576],[253,627],[294,762],[232,624],[253,618],[295,765]] },
  { name: '3.斗牛能量', dodge: 0.08, resistance: 36, perHit: 3,
    obs: [[169,402],[175,411],[198,492],[175,396],[169,384],[199,471],[174,390],[199,399],[169,384],[175,378],[169,387],[199,423]] },
  { name: '4.斗牛能量', dodge: 0.16, resistance: 36, perHit: 3,
    obs: [[157,354],[168,351],[181,384],[185,402],[192,393],[147,336],[168,360],[184,384],[181,378],[191,393]] },
  { name: '5.阋神星', dodge: 0.41, resistance: 20, perHit: 10,
    obs: [[251,1250],[270,1330],[261,1330],[281,1400],[280,1460]] },
  { name: '6.卡利莱恩', dodge: 0.55, resistance: 8, perHit: 22,
    obs: [[1103,9394],[1126,9922]] },
];

console.log('\n场景 | 闪避 | 抵抗 | 单发 | 实测命中率(反推) | 公式60%×(1−d) | 差值');
console.log('-'.repeat(85));

for (const sc of scenarios) {
  const rates: number[] = [];
  for (const [t, dmg] of sc.obs) {
    const shots = fg300ShotsAt(t);
    const hits = dmg / sc.perHit;
    rates.push(hits / shots);
  }
  const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
  const formulaMid = 0.6 * (1 - sc.dodge); // 面板中值60%
  const formulaHi = 0.7 * (1 - sc.dodge);  // 区间上沿70%
  const diff = mean - formulaMid;
  console.log(`${sc.name.padEnd(14)} | ${(sc.dodge*100).toFixed(0)}% | ${String(sc.resistance).padStart(2)} | ${String(sc.perHit).padStart(2)} | ${(mean*100).toFixed(1).padStart(5)}% | ${((formulaMid)*100).toFixed(1).padStart(5)}%~${((formulaHi)*100).toFixed(1)}% | ${(diff*100).toFixed(2)}pp`);
}

console.log('\n' + '='.repeat(85));
console.log('关键对比:反推命中率 vs 面板区间(50-70%×(1−dodge))');
console.log('='.repeat(85));
console.log('若反推命中率在 [50%×(1−d), 70%×(1−d)] 区间内 → 区间roll成立');
console.log('若反推命中率系统性偏高 → 区间分布偏向上沿,或中值>60%');
console.log('');

for (const sc of scenarios) {
  const rates: number[] = [];
  for (const [t, dmg] of sc.obs) {
    const shots = fg300ShotsAt(t);
    rates.push((dmg / sc.perHit) / shots);
  }
  const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
  const lo = 0.5 * (1 - sc.dodge);
  const hi = 0.7 * (1 - sc.dodge);
  const inRange = mean >= lo && mean <= hi;
  const overHi = mean > hi;
  console.log(`${sc.name}: 反推${(mean*100).toFixed(1)}% | 区间[${(lo*100).toFixed(1)},${(hi*100).toFixed(1)}] ${inRange?'✓区间内':overHi?'❌超上沿':'⚠️低于下沿'}`);
}
