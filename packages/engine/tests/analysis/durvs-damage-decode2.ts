/**
 * 主武器伤害结构分析(剔除异常值5135)
 */
const data = [
  { main: 5140, sub: 891, label: '场1' },
  { main: 5135, sub: 918, label: '场2(5135异常?)' },
  { main: 2570, sub: 756, label: '场3' },
  { main: 3598, sub: 729, label: '场4' },
  { main: 4626, sub: 675, label: '场5' },
  { main: 5140, sub: 837, label: '场6' },
  { main: 3598, sub: 810, label: '场7' },
  { main: 5140, sub: 837, label: '场8' },
  { main: 4626, sub: 783, label: '场9' },
  { main: 4112, sub: 702, label: '场10' },
];

function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b); }

console.log('='.repeat(80));
console.log('主武器伤害值分解(找单发perHit)');
console.log('='.repeat(80));

// 主武器伤害: 5140, 5135, 2570, 3598, 4626, 5140, 3598, 5140, 4626, 4112
// 剔除5135(唯一非5140倍数附近的), 看其余的GCD
const clean = data.filter(d => d.main !== 5135);
let g = clean[0].main;
for (const d of clean) g = gcd(g, d.main);
console.log(`剔除5135后, 主武器GCD = ${g}`);
console.log(`525的因子? 525=3×5×5×7. ${g}是否525的因子? ${525 % g === 0 ? '是' : '否'}`);
console.log(`perHit候选: ${g}`);
console.log(`减伤: ${(1 - g/525)*100}%`);

console.log('\n每场主武器命中发数(perHit=' + g + '):');
for (const d of data) {
  const hits = d.main / g;
  const isInt = Number.isInteger(hits);
  console.log(`  ${d.label}: ${d.main} / ${g} = ${hits.toFixed(2)}发 ${isInt ? '✓' : '✗(5135非整数倍, 可能记录误差或含暴击)'}`);
}

console.log('\n' + '='.repeat(80));
console.log('副武器确认: GCD=27');
console.log('='.repeat(80));
let gSub = data[0].sub;
for (const d of data) gSub = gcd(gSub, d.sub);
console.log(`副武器GCD = ${gSub}, dph28, perHit/dph = ${(gSub/28).toFixed(3)}`);
console.log(`→ 护盾3%减伤: 28×0.97=${28*0.97}, 但GCD=${gSub}`);
console.log(`→ ${gSub === 27 ? '27 = 28-1? 还是28×0.964?' : ''}`);

console.log('\n' + '='.repeat(80));
console.log('交叉验证: 主武器perHit=' + g + ' vs 副武器perHit=' + gSub);
console.log('='.repeat(80));
const fMain = g / 525;
const fSub = gSub / 28;
console.log(`主武器 f = ${g}/525 = ${fMain.toFixed(4)}`);
console.log(`副武器 f = ${gSub}/28 = ${fSub.toFixed(4)}`);
console.log(`护盾3%预测 f = 0.97`);
console.log(`→ 主武器f=${fMain.toFixed(3)} ${Math.abs(fMain-0.97)<0.01 ? '✓符合护盾3%' : '✗不符'}`);
console.log(`→ 副武器f=${fSub.toFixed(3)} ${Math.abs(fSub-0.97)<0.01 ? '✓符合护盾3%' : '✗不符, 但接近'}`);

console.log('\n' + '='.repeat(80));
console.log('每场命中发数(最终)');
console.log('='.repeat(80));
console.log('场次 | 主命中 | 副命中 | 主+副总伤');
console.log('-'.repeat(50));
for (const d of data) {
  const mH = d.main / g;
  const sH = d.sub / gSub;
  console.log(`  ${d.label} | ${Number.isInteger(mH)?mH:mH.toFixed(1)} | ${sH} | ${d.main+d.sub}`);
}
