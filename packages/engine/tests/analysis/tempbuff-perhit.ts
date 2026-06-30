/**
 * 反推perHit: 用实测时长标定每发实际伤害
 *
 * 实测 +0%档: T=74.5s, 触发~20s
 *   前段20s打掉40%血 = 20889HP
 *   后段54.5s打掉60%血 = 31334HP
 *
 * 模拟 +0%档(加法): T=61.8s, 触发16.6s
 *   模拟用的perHit: 武器1=509.3(525×0.97), 武器2=27.2(28×0.97)
 *
 * 如果实测比模拟长, 要么perHit更低, 要么发数更少。
 * 反推: 用实测前段反推有效DPS, 看需要多大perHit
 */

// 10艘斗牛, 前20s(扣除锁定)的实际开火发数
// 武器1: 锁定4s, 之后每2.7s一发, 10艘 → 在20s内每艘 (20-4)/2.7≈5.9发, 10艘≈59发
// 武器2: 锁定3s, 之后每2.1s一发, 3门10艘 → (20-3)/2.1≈8.1发/门/艘, ×3×10=243发
function shotsInWindow(wi: number, window: number, nShips: number) {
  const w = wi === 0
    ? { lockOn: 4, cooldown: 2.7, count: 1 }
    : { lockOn: 3, cooldown: 2.1, count: 3 };
  const perShip = Math.floor((window - w.lockOn) / w.cooldown + 1 + 1e-6);
  return Math.max(0, perShip) * w.count * nShips;
}

const TARGET_HP = 52223;

console.log('='.repeat(80));
console.log('前段(20s)开火发数反推');
console.log('='.repeat(80));
const s1 = shotsInWindow(0, 20, 10);
const s2 = shotsInWindow(1, 20, 10);
console.log(`武器1: ${s1}发 (每艘~${s1/10}发)`);
console.log(`武器2: ${s2}发`);

console.log('\n' + '='.repeat(80));
console.log('前段命中率(加权)反推perHit');
console.log('='.repeat(80));
const hpFront = TARGET_HP * 0.40;
console.log(`前段掉血 = ${hpFront}HP in 20s`);

// 命中率(加法,+0%k): 武器1=0.85×0.80=0.68, 武器2=0.60×0.80=0.48
const h1 = 0.85 * (1 - 0.20);
const h2 = 0.60 * (1 - 0.20);
console.log(`武器1前段命中${(h1*100).toFixed(0)}%, 武器2前段命中${(h2*100).toFixed(0)}%`);

// 设perHit系数f(相对dph): perHit1=525×f, perHit2=28×f
// 伤害 = s1×h1×525×f + s2×h2×28×f = hpFront
// f = hpFront / (s1×h1×525 + s2×h2×28)
const denom = s1 * h1 * 525 + s2 * h2 * 28;
const f = hpFront / denom;
console.log(`\n反推 perHit系数 f = ${f.toFixed(3)}`);
console.log(`  → perHit1 = 525×${f.toFixed(3)} = ${(525*f).toFixed(1)} (模型假设509.3)`);
console.log(`  → perHit2 = 28×${f.toFixed(3)} = ${(28*f).toFixed(1)} (模型假设27.2)`);
console.log(`  → f=1对应全额伤害, f=0.97对应护盾3%减伤`);
console.log(`  → 实测反推f=${f.toFixed(3)} ${f < 0.97 ? '比护盾3%减伤更多, 说明有额外减伤!' : '符合护盾3%'}`);

console.log('\n' + '='.repeat(80));
console.log('可能的额外减伤来源');
console.log('='.repeat(80));
console.log(`如果f=${f.toFixed(3)}, 总减伤 = ${((1-f)*100).toFixed(0)}%`);
console.log(`护盾3% + 可能的: 抵抗45部分生效? 装甲? 策略减伤?`);
// 若抵抗45对能量也部分生效(不太可能但排查): perHit1=525-45=480, f=480/525=0.914
console.log(`若抵抗45完全生效(实弹): f=480/525=0.914 (武器1)`);
console.log(`若抵抗45对能量也生效: 比实测f=${f.toFixed(3)} ${0.914 > f ? '仍不够, 还有别的减伤' : '够了'}`);
