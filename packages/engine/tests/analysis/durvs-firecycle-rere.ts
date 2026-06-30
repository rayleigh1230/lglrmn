/**
 * 重新审视: 10艘斗牛全打满42.5s, 无阵亡无暴击, 为何发数差2倍?
 *
 * 主武器命中发数(已锁定perHit=514):
 *   10,10,5,7,9,10,7,10,9,8  (艘3只5发, 艘1/2/6/8有10发)
 *
 * 同样42.5s, 同样配置, 发数差2倍 → 只剩几种可能:
 *   A. 发射不是匀速, 有"齐射窗口"和"停火窗口"
 *   B. 主武器有【弹药限制】, 打完就停(艘3只打了5发就停?)
 *   C. 各艘开火时刻不同步(锁定时刻RNG)
 *   D. 主武器是【持续开火N发后冷却】, N随机
 *
 * 关键检验: 副武器发数是否也差2倍?
 *   副武器命中: 33,34,28,27,25,31,30,31,29,26
 *   范围25~34, 比值1.36, 远小于主武器的2倍
 *   → 副武器发数稳定, 主武器发数剧烈波动
 */
const ships = [
  { id: 1, main: 5140, sub: 891 },
  { id: 2, main: 5135, sub: 918 },
  { id: 3, main: 2570, sub: 756 },
  { id: 4, main: 3598, sub: 729 },
  { id: 5, main: 4626, sub: 675 },
  { id: 6, main: 5140, sub: 837 },
  { id: 7, main: 3598, sub: 810 },
  { id: 8, main: 5140, sub: 837 },
  { id: 9, main: 4626, sub: 783 },
  { id: 10, main: 4112, sub: 702 },
];
const PHM = 514, PHS = 27;

console.log('='.repeat(80));
console.log('主武器 vs 副武器发数波动对比');
console.log('='.repeat(80));
console.log('艘 | 主命中 | 副命中 | 主发数/(主发数) | 副/主比值');
console.log('-'.repeat(55));
for (const s of ships) {
  const mH = s.main / PHM;
  const sH = s.sub / PHS;
  console.log(` ${s.id.toString().padStart(2)} |  ${mH.toFixed(0).padStart(2)}   |  ${sH.toFixed(0).padStart(2)}   |   ${(sH/mH).toFixed(1)}`);
}

const mainHits = ships.map(s => s.main/PHM);
const subHits = ships.map(s => s.sub/PHS);
console.log(`\n主武器: 均值${(mainHits.reduce((a,b)=>a+b)/10).toFixed(1)}, 极差${Math.max(...mainHits)-Math.min(...mainHits)}, 变异系数${(std(mainHits)/mean(mainHits)).toFixed(2)}`);
console.log(`副武器: 均值${(subHits.reduce((a,b)=>a+b)/10).toFixed(1)}, 极差${Math.max(...subHits)-Math.min(...subHits)}, 变异系数${(std(subHits)/mean(subHits)).toFixed(2)}`);
function mean(a:number[]){return a.reduce((x,y)=>x+y)/a.length}
function std(a:number[]){const m=mean(a);return Math.sqrt(a.map(x=>(x-m)**2).reduce((x,y)=>x+y)/a.length)}

console.log('\n' + '='.repeat(80));
console.log('假设检验: 主武器是否有【弹药限制】?');
console.log('='.repeat(80));
console.log('面板: 持续0 弹药1 次数1');
console.log('若"弹药1"= 1轮消耗1弹药, 弹药总量决定开火次数?');
console.log('');
// 主武器伤害的分布
const dist: Record<number, number> = {};
for (const h of mainHits) dist[h] = (dist[h]||0)+1;
console.log('主武器命中发数分布:');
for (const k of Object.keys(dist).sort((a,b)=>+a-+b)) {
  console.log(`  ${k}发: ${dist[+k]}艘`);
}
console.log('');
console.log('若每发独立判定, 42.5s内开火N发, 命中发数应≈N×命中率, 散布小');
console.log('但实测5~10发, 且出现整数聚集(5,7,8,9,10) → 像是【开火发数本身】不同');
console.log('');
console.log('关键: 主武器发数是整数聚集(5,7,8,9,10), 不是连续分布');
console.log('→ 这强烈暗示【每艘的开火发数不同】, 即开火时机/次数有随机性');

console.log('\n' + '='.repeat(80));
console.log('新假设: 武器开火是【事件触发】, 不是匀速周期');
console.log('='.repeat(80));
console.log('可能机制: 主武器有【充能/瞄准】, 开火时刻受RNG影响');
console.log('或: 主武器是【每次冷却就绪后, 满足条件才开火】');
console.log('');
// 用副武器(发数稳定)反推时间模型
console.log('用副武器(发数稳定~29发/艘 in 42.5s)反推节奏:');
const subMean = mean(subHits);
console.log(`副武器均值${subMean.toFixed(1)}发/艘 in 42.5s`);
console.log(`发间间隔 = 42.5/${subMean.toFixed(1)} = ${(42.5/subMean).toFixed(2)}s`);
console.log(`面板: 锁3+冷却2.1=5.1s周期 → 若每5.1s一发, 42.5s应${(42.5/5.1).toFixed(1)}发`);
console.log(`实测${subMean.toFixed(1)}发, 面板预测${(42.5/5.1).toFixed(1)}发`);
console.log(`→ 比值${(subMean/(42.5/5.1)).toFixed(2)}`);

console.log('\n主武器:');
const mainMean = mean(mainHits);
console.log(`主武器均值${mainMean.toFixed(1)}发/艘 in 42.5s`);
console.log(`面板: 锁4+冷却2.7=6.7s周期 → 42.5s应${(42.5/6.7).toFixed(1)}发`);
console.log(`实测${mainMean.toFixed(1)}发, 面板预测${(42.5/6.7).toFixed(1)}发`);
console.log(`→ 比值${(mainMean/(42.5/6.7)).toFixed(2)}`);
