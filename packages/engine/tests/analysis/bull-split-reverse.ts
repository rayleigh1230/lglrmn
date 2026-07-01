/**
 * 斗牛主/副武器分离反推 —— 解开"下限 vs 中值"矛盾
 *
 * 【关键新数据 2026-07-01】用户提供了斗牛4场的主/副武器分别伤害！
 *   主武器伤害四场几乎相同(43685~44393) → 主武器命中发数固定≈86-87
 *   这与轨道炮场景"394发固定"是同一性质 → 数据自洽铁证
 *
 * 【斗牛参数】
 *   10艘，主武器1门(dph525/护盾3%/cd2.7/lock4) → perHit=509.25
 *          副武器3门(dph28/护盾3%/cd2.1/lock3) → perHit=27.16
 *   主武器命中区间 70%-100%（下限0.70/中值0.85）
 *   副武器命中区间 50%-70%（下限0.50/中值0.60）← 与轨道炮同区间！
 *
 * 【实测数据】
 *   场景        | 主伤害  | 副伤害 | 时长
 *   无策略+0%   | 44360   | 7263  | 50s
 *   无策略+30%  | 43685   | 7938  | 42s
 *   有策略+0%   | 44393   | 7830  | 74s
 *   有策略+30%  | 44204   | 8019  | 52s
 *
 * 【反推方法】
 *   主武器命中发数 = 主伤害 / 509.25
 *   主武器总发数 = 10艘 × 1门 × 周期数C
 *   周期数C：主武器 首轮lock4 → 1发；之后每cd2.7 → 1发
 *   战报时长含后摇5s → 净击毁时刻 = 时长 − 5
 *   C = 1 + (净时刻 − 4) / 2.7
 *   主武器命中率 = 主命中发数 / (10 × C)
 *
 *   副武器同理：3门，首轮lock3 → 3发；之后每cd2.1 → 3发
 *   副武器命中率 = 副命中发数 / (10 × 3 × C_s)
 *
 * 【对照】
 *   主武器区间70-100%，反推值对照下限0.70/中值0.85
 *   副武器区间50-70%，反推值对照下限0.50/中值0.60 ← 与轨道炮(0.616)同区间直接对比！
 *
 * 用法：npx tsx tests/analysis/bull-split-reverse.ts
 */

const perHit_m = 525 * (1 - 0.03); // 509.25
const perHit_s = 28 * (1 - 0.03);  // 27.16
const N = 10;
const cd_m = 2.7, lock_m = 4;
const cd_s = 2.1, lock_s = 3;
const cnt_m = 1, cnt_s = 3; // 主1门/副3门
const POST_DELAY = 5;

interface Scene {
  name: string;
  mwDmg: number; swDmg: number; T: number;
  dodge: number; k: number; hasBuff: boolean;
  buffDodge?: number;
}

const scenes: Scene[] = [
  { name: '无策略+0%',  mwDmg: 44360, swDmg: 7263, T: 50, dodge: 0.20, k: 0,    hasBuff: false },
  { name: '无策略+30%', mwDmg: 43685, swDmg: 7938, T: 42, dodge: 0.20, k: 0.30, hasBuff: false },
  { name: '有策略+0%',  mwDmg: 44393, swDmg: 7830, T: 74, dodge: 0.20, k: 0,    hasBuff: true, buffDodge: 0.40 },
  { name: '有策略+30%', mwDmg: 44204, swDmg: 8019, T: 52, dodge: 0.20, k: 0.30, hasBuff: true, buffDodge: 0.40 },
];

// 计算到killTime为止，单门武器打了多少周期
function cyclesFired(killTime: number, lock: number, cd: number): { cFloor: number; cCeil: number; cTheo: number } {
  if (killTime < lock) return { cFloor: 0, cCeil: 0, cTheo: 0 };
  const cTheo = 1 + (killTime - lock) / cd;
  const cFloor = Math.floor(cTheo);
  return { cFloor, cCeil: cFloor + 1, cTheo };
}

console.log('='.repeat(90));
console.log('斗牛主/副武器分离反推 —— 解开"下限vs中值"矛盾');
console.log('='.repeat(90));
console.log(`参数: perHit主${perHit_m.toFixed(2)}/副${perHit_s.toFixed(2)}, N=${N}`);
console.log(`主: ${cnt_m}门 cd${cd_m} lock${lock_m} | 副: ${cnt_s}门 cd${cd_s} lock${lock_s}`);
console.log(`主区间70-100% | 副区间50-70%(与轨道炮同区间)\n`);

console.log('场景        | 时长 | 主伤害 | 主命中发 | 副伤害 | 副命中发');
console.log('  ' + '-'.repeat(86));
const results: any[] = [];
for (const s of scenes) {
  const killTime = s.T - POST_DELAY;
  const mHits = s.mwDmg / perHit_m;
  const sHits = s.swDmg / perHit_s;
  console.log(`${s.name.padEnd(11)} | ${String(s.T).padStart(3)}s | ${s.mwDmg} | ${mHits.toFixed(2).padStart(7)} | ${s.swDmg} | ${sHits.toFixed(2).padStart(7)}`);
  results.push({ ...s, killTime, mHits, sHits });
}

console.log('\n' + '='.repeat(90));
console.log('【主武器反推】每场算出主武器命中率');
console.log('='.repeat(90));
console.log('  场景        | 击毁时刻 | 主周期C | 主总发数 | 主命中率(best) | 主命中率范围');
console.log('  ' + '-'.repeat(86));
for (const r of results) {
  const cyc = cyclesFired(r.killTime, lock_m, cd_m);
  const totalFloor = N * cnt_m * cyc.cFloor;
  const totalCeil = N * cnt_m * cyc.cCeil;
  const pFloor = r.mHits / totalFloor;
  const pCeil = r.mHits / totalCeil;
  // 选战报更接近的
  const tFireFloor = lock_m + (cyc.cFloor - 1) * cd_m;
  const tFireCeil = lock_m + (cyc.cCeil - 1) * cd_m;
  const useFloor = Math.abs(tFireFloor + POST_DELAY - r.T) <= Math.abs(tFireCeil + POST_DELAY - r.T);
  const pBest = useFloor ? pFloor : pCeil;
  const cBest = useFloor ? cyc.cFloor : cyc.cCeil;
  console.log(`  ${r.name.padEnd(11)} | ${r.killTime}s     | ${cyc.cFloor}~${cyc.cCeil}  | ${totalFloor}~${totalCeil}  |   ${(pBest*100).toFixed(2)}%      | [${(pCeil*100).toFixed(2)}%, ${(pFloor*100).toFixed(2)}%]`);
  (r as any).pMain = pBest; (r as any).pMainRange = [pCeil, pFloor];
}

console.log('\n  主武器区间 70%-100% (下限0.70/中值0.85)');
console.log('  无策略+0%主命中率 vs 加法公式 base×(1+0−0.20)=base×0.80:');
const base0NoStrat = (results[0] as any).pMain / (1 + 0 - 0.20);
console.log(`    反推base = ${(results[0] as any).pMain.toFixed(4)} / 0.80 = ${base0NoStrat.toFixed(4)} (${(base0NoStrat*100).toFixed(2)}%)`);
console.log(`    对照: 下限0.70 偏差${(Math.abs(base0NoStrat-0.70)*100).toFixed(2)}pp | 中值0.85 偏差${(Math.abs(base0NoStrat-0.85)*100).toFixed(2)}pp`);

console.log('\n' + '='.repeat(90));
console.log('【副武器反推】每场算出副武器命中率（关键：与轨道炮同区间50-70%！）');
console.log('='.repeat(90));
console.log('  场景        | 副周期C | 副总发数 | 副命中率(best) | 副命中率范围');
console.log('  ' + '-'.repeat(86));
for (const r of results) {
  const cyc = cyclesFired(r.killTime, lock_s, cd_s);
  const totalFloor = N * cnt_s * cyc.cFloor;
  const totalCeil = N * cnt_s * cyc.cCeil;
  const pFloor = r.sHits / totalFloor;
  const pCeil = r.sHits / totalCeil;
  const tFireFloor = lock_s + (cyc.cFloor - 1) * cd_s;
  const tFireCeil = lock_s + (cyc.cCeil - 1) * cd_s;
  const useFloor = Math.abs(tFireFloor + POST_DELAY - r.T) <= Math.abs(tFireCeil + POST_DELAY - r.T);
  const pBest = useFloor ? pFloor : pCeil;
  console.log(`  ${r.name.padEnd(11)} | ${cyc.cFloor}~${cyc.cCeil}  | ${totalFloor}~${totalCeil}  |   ${(pBest*100).toFixed(2)}%      | [${(pCeil*100).toFixed(2)}%, ${(pFloor*100).toFixed(2)}%]`);
  (r as any).pSec = pBest; (r as any).pSecRange = [pCeil, pFloor];
}

// 副武器无策略+0% 反推base（与轨道炮同区间，最干净的对照）
console.log('\n  副武器区间 50%-70% (下限0.50/中值0.60) ← 与轨道炮同区间！');
console.log('  无策略+0%副命中率 vs 加法公式 base×(1+0−0.20)=base×0.80:');
const base0NoStratS = (results[0] as any).pSec / (1 + 0 - 0.20);
console.log(`    反推base = ${(results[0] as any).pSec.toFixed(4)} / 0.80 = ${base0NoStratS.toFixed(4)} (${(base0NoStratS*100).toFixed(2)}%)`);
console.log(`    对照: 下限0.50 偏差${(Math.abs(base0NoStratS-0.50)*100).toFixed(2)}pp | 中值0.60 偏差${(Math.abs(base0NoStratS-0.60)*100).toFixed(2)}pp`);

console.log('\n' + '='.repeat(90));
console.log('【★核心对照：同区间50-70%的副武器 vs 轨道炮★】');
console.log('='.repeat(90));
console.log('  武器         | 区间     | 反推base | 在区间位置 | 结论');
console.log('  ' + '-'.repeat(70));
const bullSec = base0NoStratS;
const railgun = 0.616;
function position(b: number, lo: number, hi: number): string {
  const p = (b - lo) / (hi - lo);
  if (p < 0.25) return '接近下限';
  if (p < 0.4) return '1/4~1/3位';
  if (p < 0.6) return '中值附近';
  if (p < 0.75) return '中值~2/3位';
  return '接近上限';
}
console.log(`  斗牛副武器   | 50-70%   | ${bullSec.toFixed(3)}  | ${position(bullSec,0.5,0.7).padEnd(10)} | ${Math.abs(bullSec-0.6)<0.05?'与轨道炮一致✓':'与轨道炮不一致?'}`);
console.log(`  康纳马拉轨道炮| 50-70%   | ${railgun.toFixed(3)}  | ${position(railgun,0.5,0.7).padEnd(10)} | (基准)`);

console.log('\n' + '='.repeat(90));
console.log('【★主武器对照（主区间70-100%）★】');
console.log('='.repeat(90));
const bullMain = base0NoStrat;
console.log(`  斗牛主武器   | 70-100%  | ${bullMain.toFixed(3)}  | ${position(bullMain,0.7,1.0).padEnd(10)} | 对照下限0.70/中值0.85`);
console.log(`  (注意：主武器反推可能受副武器污染，因主武器是10门×1发 vs 副武器10×3门)`);

console.log('\n' + '='.repeat(90));
console.log('【结论】');
console.log('='.repeat(90));
console.log(`斗牛副武器base = ${bullSec.toFixed(3)} (区间50-70%)`);
console.log(`轨道炮base    = ${railgun.toFixed(3)} (区间50-70%)`);
console.log(`差异 = ${(Math.abs(bullSec-railgun)*100).toFixed(2)}pp`);
if (Math.abs(bullSec - railgun) < 0.05) {
  console.log('→ 同区间的两把武器反推base一致 → base取值规则统一：都落在区间内固定位置');
  console.log(`→ "下限结论"确认为误读，实际base≈${((bullSec+railgun)/2).toFixed(3)}（中值偏上）`);
} else {
  console.log('→ 同区间两武器base不一致，需进一步分析');
}
