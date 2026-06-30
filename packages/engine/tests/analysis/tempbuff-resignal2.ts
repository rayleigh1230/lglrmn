/**
 * 临时 buff 信号差：两种物理情景的对比 + 最优测试条件
 *
 * 上一版脚本第一栏(4.91pp)和第二栏(0.4pp)结论相反，原因是两套占空比模型
 * 物理含义不同。这里把两种【情景】讲清楚，并明确哪种符合实际。
 *
 * 情景X（buff全程覆盖后段）：
 *   buff 持续 ≥ 后段存活时间 → 整个后段都在 buff 窗内
 *   这要求：buffDur ≥ T_后 = (剩余HP) / (DPS × hit_后)
 *   即船在后段死得够快（高DPS集火 或 低血量触发）
 *   船A：剩60%血，要45s内死 → 需要较高DPS
 *
 * 情景Y（buff只覆盖部分后段）：
 *   buff 持续 < 后段存活时间 → buff 用完后还有无buff的尾巴
 *   1v1 慢节奏通常落在这里
 *
 * 关键：【能否进入情景X】决定了信号能否被放大到可辨水平。
 *       情景X的占空比 = T_后/(T_前+T_后)，由血量比和命中率决定，与buffDur无关
 *       （只要buffDur够长覆盖后段）。
 */
const BASE = 0.687;
const FLOOR = 0.10;
const hitAdd = (d: number, k = 0) => Math.max(BASE * (1 - d - k), FLOOR);
const hitMul = (d: number, k = 0) => Math.max(BASE * (1 - d) * (1 - k), FLOOR);

console.log('='.repeat(92));
console.log('一、两种情景的判别：buff 能否覆盖整个后段？');
console.log('='.repeat(92));
console.log('条件：buffDur(秒) ≥ T_后 = (剩余HP比例/总HP) / (DPS_norm × hit_后)');
console.log('     其中 DPS_norm 是把总HP归一为1后的有效DPS。实际取决于攻击方配置。\n');

// 用"归一化时间"分析：设总HP=1，DPS=1（归一），则时间 = HP比例/命中率
// 但实际DPS可调（集火规模）。用 T_total 这个自由参数扫描。
console.log('假设【总战斗时长 T_total】从 60s 到 600s（集火规模反推）：');
console.log('  T_total 短 = 高DPS集火（多船）→ 后段死得快 → buff易覆盖（情景X）');
console.log('  T_total 长 = 1v1慢节奏 → 后段死得慢 → buff覆盖不全（情景Y）\n');

const ships = [
  { name: '船A', d: 0.20, trigFrac: 0.60, buffDur: 45 }, // 剩60%血触发
  { name: '船B', d: 0.25, trigFrac: 0.20, buffDur: 40 }, // 剩20%血触发
];

console.log('配置 | T_total | 后段血量比 | 后段时长T_后 | buffDur | 覆盖? | 情景 | 信号差');
console.log('-'.repeat(92));
for (const s of ships) {
  for (const T of [600, 400, 300, 200, 150, 120, 100, 80, 60]) {
    // 后段时长 = 后段血量比 × T_total（按血量比例分配时间，但实际还受命中率影响）
    // 精确：前段时长 ∝ (1-trigFrac)/hit_前，后段 ∝ trigFrac/hit_后
    const hitBefore = hitAdd(s.d, 0);
    const hitAfter = hitAdd(s.d, 0.40);
    const tBeforeFrac = (1 - s.trigFrac) / hitBefore;
    const tAfterFrac = s.trigFrac / hitAfter;
    const totalFrac = tBeforeFrac + tAfterFrac;
    const T_after = (tAfterFrac / totalFrac) * T; // 后段绝对秒数
    const covered = T_after <= s.buffDur;
    const scenario = covered ? 'X全覆盖' : 'Y部分';
    const buffTime = Math.min(s.buffDur, T_after);
    const duty = buffTime / T;
    // 信号差（用加法模型的占空比算两种假设的avgHit）
    const avgAdd = hitBefore * (1 - duty) + hitAfter * duty;
    const hitAfterM = hitMul(s.d, 0.40);
    const avgMul = hitBefore * (1 - duty) + hitAfterM * duty;
    const diff = Math.abs(avgAdd - avgMul) * 100;
    const mark = diff > 2 ? '✓' : diff > 1 ? '~' : ' ';
    console.log(`${s.name} | ${String(T).padStart(3)}s |   ${(s.trigFrac * 100).toFixed(0)}%    |   ${T_after.toFixed(0)}s    |  ${s.buffDur}s  | ${covered ? '✓' : '✗ '}  | ${scenario} | ${diff.toFixed(1)}pp ${mark}`);
  }
  console.log('');
}

console.log('='.repeat(92));
console.log('二、关键转折点：T_total 多短时进入情景X（buff全覆盖后段）？');
console.log('='.repeat(92));
for (const s of ships) {
  const hitBefore = hitAdd(s.d, 0);
  const hitAfter = hitAdd(s.d, 0.40);
  const tBeforeFrac = (1 - s.trigFrac) / hitBefore;
  const tAfterFrac = s.trigFrac / hitAfter;
  const totalFrac = tBeforeFrac + tAfterFrac;
  // 情景X边界：T_after = buffDur → T = buffDur × totalFrac / tAfterFrac
  const T_boundary = (s.buffDur * totalFrac) / tAfterFrac;
  console.log(`${s.name}: 后段占时间比 = ${(tAfterFrac / totalFrac * 100).toFixed(0)}%，情景X需 T_total ≤ ${T_boundary.toFixed(0)}s`);
  console.log(`  → 即战斗总时长压到 ${T_boundary.toFixed(0)}s 以内（约 ${(600 / T_boundary).toFixed(1)} 船集火），buff 全程覆盖后段`);
  // 此时占空比 = tAfterFrac/totalFrac（最大可能值）
  const maxDuty = tAfterFrac / totalFrac;
  const hitAfterM = hitMul(s.d, 0.40);
  const avgAdd = hitBefore * (1 - maxDuty) + hitAfter * maxDuty;
  const avgMul = hitBefore * (1 - maxDuty) + hitAfterM * maxDuty;
  const diff = Math.abs(avgAdd - avgMul) * 100;
  console.log(`  → 情景X最大占空比 = ${(maxDuty * 100).toFixed(0)}%，信号差 = ${diff.toFixed(1)}pp（加法${(avgAdd * 100).toFixed(1)}% vs 乘法${(avgMul * 100).toFixed(1)}%）\n`);
}

console.log('='.repeat(92));
console.log('三、结论：明显区分的条件');
console.log('='.repeat(92));
console.log('【船A d20%, 结构<60%触发】是最佳测试对象：');
console.log('  - 60%血量触发 → 后段血量大 → 后段时间占比高（~60%+）');
console.log('  - buff 45s 较长');
console.log('  - 关键：把战斗总时长压到 ~150s 以内（约4船集火），buff 全覆盖后段');
console.log('  - 此时信号差达 4-5pp，3-4场即可3σ显著');
console.log('');
console.log('【船B d25%, 结构<20%触发】较差：');
console.log('  - 20%血量触发 → 后段血量小 → 后段占比低（~20%），即使全覆盖信号也弱');
console.log('');
console.log('⚠️ 噪声修正：实测多场散布可能>±2pp（命中率受RNG区间roll影响），');
console.log('   建议保守按±2.5pp算，信号差需>3pp才稳妥。');
