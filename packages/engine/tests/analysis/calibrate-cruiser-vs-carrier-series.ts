/**
 * 康纳马拉轨道炮巡洋舰 vs CV3000航母 —— 多N系列对比
 *
 * 核心实验设计（用户目标2：逐步减N确认是否有命中衰减）：
 *   固定靶（同一艘航母HP=370192），攻击方数量N变化。
 *   因为靶HP固定、武器2贡献固定 → 武器1命中发数几乎固定（≈394）。
 *   所以【命中率完全由总发数决定，总发数由战报时长决定】。
 *   这是极干净的实验：唯一外生变量 = 战报时长。
 *
 * 【已有数据】
 *   N=8: 战报 5:42(342s), 武器1伤害 366608, 武器2伤害 3584
 *   N=6: 战报 7:25(445s), 武器1伤害 366680, 武器2 ≈3512 (HP-武器1)
 *
 * 【建模】
 *   单发实弹 = 1200−270 = 930（破甲成立）
 *   每周期 = 弹药2×次数1 = 2发（持续0，同时打出）
 *   周期节奏：首轮 lock8 → 2发；之后每 cooldown8.4 → 2发
 *   无暴击；后摇5s（文档§1.3）
 *   击毁时刻 = 战报 − 5；净开火时段 = 击毁时刻 − 8
 *
 * 【命中率反推】
 *   命中发数 = 武器1伤害 / 930  （硬数据，固定≈394）
 *   总发数 = N × 2 × 周期数C
 *   周期数C：击毁发生在某开火时刻 t_fire=8+(C−1)×8.4，战报=t_fire+5
 *   ⇒ C = 1 + (战报−13)/8.4
 *   命中率 p = 命中发数 / (N×2×C)
 *
 * 【周期离散化处理】
 *   C理论上不是整数（战报观测有误差/后摇不精确）。
 *   给出 C_floor 和 C_ceil 两个候选，各自的p，并标注实测战报更接近哪个。
 *
 * 用法：npx tsx tests/analysis/calibrate-cruiser-vs-carrier-series.ts
 */

const DPH = 1200;
const RESISTANCE = 270;
const PER_HIT = DPH - RESISTANCE; // 930
const SHOTS_PER_CYCLE = 2;
const COOLDOWN = 8.4;
const LOCK_ON = 8;
const POST_DELAY = 5;
const HP = 370192;

interface Battle {
  n: number;
  label: string;
  w1Damage: number;
}

const battles: Battle[] = [
  { n: 8, label: '5:42', w1Damage: 366608 },
  { n: 6, label: '7:25', w1Damage: 366680 },
  { n: 4, label: '11:17', w1Damage: 366622 },
  { n: 2, label: '22:30', w1Damage: 366630 },
  // N=1 跳过：航母场景下N=1时长~44min超限，且超长时长下per-shot roll与期望伤害趋同无法区分（见对话）
];

function parseLabel(s: string): number {
  const [m, sec] = s.split(':').map(Number);
  return m * 60 + sec;
}

console.log('='.repeat(98));
console.log('康纳马拉轨道炮巡洋舰 vs CV3000航母 —— 多N系列对比（命中率随N变化？）');
console.log('='.repeat(98));
console.log(`参数：单发${PER_HIT}、${SHOTS_PER_CYCLE}发/周期、冷却${COOLDOWN}s、锁定${LOCK_ON}s、后摇${POST_DELAY}s\n`);

const results: {
  n: number; tObs: number; killTime: number; hitShots: number;
  cTheoretical: number; cFloor: number; cCeil: number;
  pFloor: number; pCeil: number; pBest: number;
}[] = [];

for (const b of battles) {
  const tObs = parseLabel(b.label);
  const killTime = tObs - POST_DELAY;
  const hitShots = b.w1Damage / PER_HIT;

  console.log(`【N=${b.n}】 战报 ${b.label}(${tObs}s)，武器1伤害 ${b.w1Damage}`);
  console.log(`  击毁时刻 = ${tObs}−${POST_DELAY} = ${killTime}s`);
  console.log(`  命中发数（硬数据）= ${b.w1Damage}/${PER_HIT} = ${hitShots.toFixed(2)} 发`);

  // 理论周期数
  const cTheoretical = 1 + (tObs - 13) / COOLDOWN; // =1+(killTime-8)/8.4
  const cFloor = Math.floor(cTheoretical);
  const cCeil = cFloor + 1;
  console.log(`  理论周期数 C = 1+(${tObs}−13)/${COOLDOWN} = ${cTheoretical.toFixed(2)} → 候选 ${cFloor} 或 ${cCeil}`);

  // 两个候选的p和预测战报
  const totalFloor = b.n * SHOTS_PER_CYCLE * cFloor;
  const totalCeil = b.n * SHOTS_PER_CYCLE * cCeil;
  const pFloor = hitShots / totalFloor;
  const pCeil = hitShots / totalCeil;
  const tFireFloor = LOCK_ON + (cFloor - 1) * COOLDOWN;
  const tFireCeil = LOCK_ON + (cCeil - 1) * COOLDOWN;
  const reportFloor = tFireFloor + POST_DELAY;
  const reportCeil = tFireCeil + POST_DELAY;
  console.log(`  ┌ C=${cFloor}: 总发${totalFloor}, p=${(pFloor*100).toFixed(2)}%, 预测战报=${reportFloor.toFixed(1)}s (实测差${Math.abs(reportFloor-tObs).toFixed(1)})`);
  console.log(`  └ C=${cCeil}: 总发${totalCeil}, p=${(pCeil*100).toFixed(2)}%, 预测战报=${reportCeil.toFixed(1)}s (实测差${Math.abs(reportCeil-tObs).toFixed(1)})`);

  // 选更接近实测战报的候选
  const useFloor = Math.abs(reportFloor - tObs) <= Math.abs(reportCeil - tObs);
  const pBest = useFloor ? pFloor : pCeil;
  const cBest = useFloor ? cFloor : cCeil;
  console.log(`  → 取 C=${cBest}（战报更接近），p = ${(pBest*100).toFixed(2)}%`);
  console.log(`  → p范围 [${(pCeil*100).toFixed(2)}%, ${(pFloor*100).toFixed(2)}%]（周期离散化上下界）\n`);

  results.push({ n: b.n, tObs, killTime, hitShots, cTheoretical, cFloor, cCeil, pFloor, pCeil, pBest });
}

// ===== DPS 交叉验证（独立于周期离散化） =====
console.log('='.repeat(98));
console.log('【DPS交叉验证】（不依赖周期离散化，只依赖时长+后摇假设）');
console.log('='.repeat(98));
console.log('  若命中率不随N变，DPS应正比于N，DPS比值应=N比值');
console.log('  N   | 净开火时段 | 武器1DPS  | DPS/艘 | DPS比(vsN8) | N比   | 偏差');
console.log('  ' + '-'.repeat(94));
for (let i = 0; i < results.length; i++) {
  const r = results[i];
  const netFireTime = r.killTime - LOCK_ON; // 净开火时段（扣锁定）
  const dps = battles[i].w1Damage / netFireTime;
  const dpsPerShip = dps / r.n;
  const dpsRatio = dps / (battles[0].w1Damage / (results[0].killTime - LOCK_ON));
  const nRatio = r.n / battles[0].n;
  const dev = ((dpsRatio - nRatio) / nRatio * 100);
  console.log(`  ${r.n}   |  ${netFireTime.toFixed(1)}s   | ${dps.toFixed(1)}/s | ${dpsPerShip.toFixed(1)} |   ${dpsRatio.toFixed(4)}   | ${nRatio.toFixed(4)} | ${dev>=0?'+':''}${dev.toFixed(2)}%`);
}
console.log('\n  解读：DPS比>N比 → N减少后命中率反而略高（或周期离散化使然）；DPS比≈N比 → 命中率不随N变。');

// ===== 横向对比表 =====
console.log('\n' + '='.repeat(98));
console.log('【命中率横向对比：是否随N衰减？】');
console.log('='.repeat(98));
console.log('  N   | 战报  | 命中发数 | 最佳p    | p范围             | 对照区间');
console.log('  ' + '-'.repeat(94));
for (let i = 0; i < results.length; i++) {
  const r = results[i];
  console.log(`  ${r.n}   | ${battles[i].label.padStart(5)} | ${r.hitShots.toFixed(1).padStart(8)} | ${(r.pBest*100).toFixed(2)}%  | [${(r.pCeil*100).toFixed(2)}%, ${(r.pFloor*100).toFixed(2)}%] | 50%-70%`);
}

// ===== 对照区间各端点 =====
console.log('\n' + '='.repeat(98));
console.log('【对照命中区间50%-70%的各候选】');
console.log('='.repeat(98));
const candidates = [
  { name: '下限0.50', val: 0.5 },
  { name: '中值0.60', val: 0.6 },
  { name: '2/3位0.633', val: 0.6333 },
  { name: '上限0.70', val: 0.7 },
];
for (const r of results) {
  console.log(`\n  N=${r.n} (p=${(r.pBest*100).toFixed(2)}%):`);
  for (const c of candidates) {
    const diff = Math.abs(r.pBest - c.val);
    const marker = diff < 0.02 ? '  ← 最近' : '';
    console.log(`    ${c.name}: 偏差 ${(diff*100).toFixed(2)}pp${marker}`);
  }
}

// ===== 结论（自适应数据量）=====
console.log('\n' + '='.repeat(98));
console.log('【阶段性结论】');
console.log('='.repeat(98));

// 把结果按 N 升序排列做趋势分析
const sorted = [...results].sort((a, b) => a.n - b.n);
console.log('\nN   | 命中率(best) | 命中率范围');
console.log('  ' + '-'.repeat(60));
for (const r of sorted) {
  console.log(`${r.n}   |   ${(r.pBest*100).toFixed(2)}%    | [${(r.pCeil*100).toFixed(2)}%, ${(r.pFloor*100).toFixed(2)}%]`);
}

const allP = sorted.map(r => r.pBest);
const pMin = Math.min(...allP);
const pMax = Math.max(...allP);
const pRange = (pMax - pMin) * 100;
console.log(`\n命中率全程跨度: ${(pMin*100).toFixed(2)}% ~ ${(pMax*100).toFixed(2)}% (Δ=${pRange.toFixed(2)}pp)`);

// N间最大差异 + 趋势方向
if (sorted.length >= 2) {
  const pLowN = sorted[0];        // N最小
  const pHighN = sorted[sorted.length-1]; // N最大
  const trend = (pHighN.pBest - pLowN.pBest) * 100;
  console.log(`N=${pLowN.n}(小) → N=${pHighN.n}(大): p变化 ${trend>=0?'+':''}${trend.toFixed(2)}pp`);
  if (pRange < 3) {
    console.log(`判断: 命中率基本不随N变化（全程跨度${pRange.toFixed(2)}pp < 3pp阈值，在离散化误差内）`);
  } else {
    console.log(`判断: 命中率随N有${trend>0?'降低':'升高'}趋势（跨度${pRange.toFixed(2)}pp ≥ 3pp），需进一步分析`);
  }
}

// 对照区间
const avgP = allP.reduce((a,b)=>a+b,0)/allP.length;
console.log(`\nbase平均 = ${(avgP*100).toFixed(2)}%`);
const summaryCandidates = [
  { name: '下限0.50', val: 0.5 },
  { name: '中值0.60', val: 0.6 },
  { name: '2/3位0.633', val: 0.6333 },
  { name: '上限0.70', val: 0.7 },
];
let bestC = summaryCandidates[0];
for (const c of summaryCandidates) {
  if (Math.abs(avgP - c.val) < Math.abs(avgP - bestC.val)) bestC = c;
}
console.log(`最近候选: ${bestC.name} (平均偏差${(Math.abs(avgP-bestC.val)*100).toFixed(2)}pp)`);
console.log(`与下限0.50差: ${(Math.abs(avgP-0.5)*100).toFixed(2)}pp ${Math.abs(avgP-0.5)>0.08?'❌ 下限结论不成立':'⚠️ 接近下限'}`);

console.log(`\n⚠️ 本系列为+0%档，仅判"base是否随N变"，无法判§1.3的+30%加成衰减。`);
console.log(`⚠️ 注意N=1: 单舰DPS=139/s，打满航母HP370192需约2663s(44min)，可能超战斗时长上限。`);

if (results.length < 4) {
  console.log(`\n⏳ 当前已测 ${results.length} 场，待补测至 N=4/2/1 以完成趋势分析。`);
}
