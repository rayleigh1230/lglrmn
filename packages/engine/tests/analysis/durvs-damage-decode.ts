/**
 * 分武器伤害分析 —— 从伤害数值锁定 perHit
 *
 * 实测主武器/副武器伤害(10场, 无策略靶/有策略靶混合):
 */
const data = [
  { main: 5140, sub: 891 },
  { main: 5135, sub: 918 },
  { main: 2570, sub: 756 },
  { main: 3598, sub: 729 },
  { main: 4626, sub: 675 },
  { main: 5140, sub: 837 },
  { main: 3598, sub: 810 },
  { main: 5140, sub: 837 },
  { main: 4626, sub: 783 },
  { main: 4112, sub: 702 },
];

console.log('='.repeat(80));
console.log('一、伤害值的整数倍结构(锁定perHit)');
console.log('='.repeat(80));

// 检测主武器伤害的最大公约数
function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b); }
let gMain = data[0].main;
for (const d of data) gMain = gcd(gMain, d.main);
let gSub = data[0].sub;
for (const d of data) gSub = gcd(gSub, d.sub);
console.log(`主武器伤害GCD = ${gMain}`);
console.log(`副武器伤害GCD = ${gSub}`);

// 每场伤害 / GCD = 命中发数
console.log('\n场次 | 主武器 | /GCD | 副武器 | /GCD');
console.log('-'.repeat(50));
for (const d of data) {
  console.log(`  ${data.indexOf(d)+1}  | ${d.main} | ${d.main/gMain}发 | ${d.sub} | ${(d.sub/gSub).toFixed(1)}发`);
}

console.log('\n' + '='.repeat(80));
console.log('二、perHit反推');
console.log('='.repeat(80));
console.log(`主武器dph=525, 若GCD=${gMain}是单发伤害 → perHit=${gMain}`);
console.log(`  perHit/dph = ${gMain}/525 = ${(gMain/525).toFixed(3)}`);
console.log(`  → ${gMain < 525 ? '减伤' + ((1-gMain/525)*100).toFixed(0) + '%' : '不是单发伤害'}`);
console.log('');
console.log(`副武器dph=28, 若GCD=${gSub}是单发伤害 → perHit=${gSub}`);
console.log(`  perHit/dph = ${gSub}/28 = ${(gSub/28).toFixed(3)}`);

console.log('\n' + '='.repeat(80));
console.log('三、交叉验证: 两个武器的减伤系数应一致');
console.log('='.repeat(80));
const fMain = gMain / 525;
const fSub = gSub / 28;
console.log(`主武器 f = ${(fMain).toFixed(3)}`);
console.log(`副武器 f = ${(fSub).toFixed(3)}`);
console.log(`两武器f一致? ${Math.abs(fMain - fSub) < 0.01 ? '✓ 一致!' : '✗ 不一致'}`);

console.log('\n' + '='.repeat(80));
console.log('四、每场命中发数(用perHit反推)');
console.log('='.repeat(80));
console.log('场次 | 主命中发数 | 副命中发数');
console.log('-'.repeat(40));
for (const d of data) {
  const mHits = d.main / gMain;
  const sHits = d.sub / gSub;
  console.log(`  ${data.indexOf(d)+1}  |   ${mHits}     |   ${sHits}`);
}
