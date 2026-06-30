/**
 * 临时 buff 加法 vs 乘法 的【可观测性】重算（修正占空比模型）
 *
 * 之前算错的两点：
 *   1. "结构<60%触发"是剩60%血就开（不是剩40%），触发点在战斗前段
 *   2. 后段（有buff）掉血更慢（命中率低），所以后段时间比前段长
 *
 * 核心耦合：占空比是【时间比】，而时间取决于掉血速度（命中率）。
 *   前段（无buff）：掉血快（命中率高）
 *   后段（有buff）：掉血慢（命中率低）→ 时间被拉长 → 占空比 > 血量比
 *
 * 时间关系：
 *   T_前 = HP前 / (DPS × hit_前)      前段打掉 40%HP 的时间
 *   T_后 = HP后 / (DPS × hit_后)      后段打掉 60%HP 的时间（受限于buff持续或死亡）
 *   占空比 = min(T_buff, T_后) / (T_前 + T_后)
 *
 * 注意：buff 有持续时长上限（船A=45s, 船B=40s）。
 *   - 若 T_后 ≤ buff持续：buff 全程覆盖后段，占空比 = T_后/(T_前+T_后)
 *   - 若 T_后 > buff持续：buff 只覆盖部分后段
 *
 * 用法：npx tsx tests/tempbuff-resignal.ts
 */
const BASE = 0.687;
const FLOOR = 0.10;
const hitAdd = (d: number, k = 0) => Math.max(BASE * (1 - d - k), FLOOR);
const hitMul = (d: number, k = 0) => Math.max(BASE * (1 - d) * (1 - k), FLOOR);

/**
 * 精确模拟一场战斗的时间加权平均命中率。
 * 船在触发阈值 X% HP 时开 buff，持续 buffDur 秒。
 * 战斗分为：前段（满血→X%HP，无buff） + 后段（X%HP→0，有buff直到buffDur或死亡）
 *
 * 假设匀速掉血（DPS恒定，命中率决定掉血速度）。
 * 时间 ∝ HP掉落量 / 命中率。
 */
function simulate(d: number, k: number, trigFrac: number, buffDur: number, model: 'add' | 'mul') {
  // trigFrac = 触发时剩余HP占比（船A=0.60, 船B=0.20）
  const hpBefore = 1 - trigFrac; // 前段打掉的HP比例
  const hpAfter = trigFrac;      // 后段打掉的HP比例

  const hitBefore = model === 'add' ? hitAdd(d, 0) : hitMul(d, 0);
  const hitAfterBuff = model === 'add' ? hitAdd(d, k) : hitMul(d, k);

  // 前段时间 ∝ hpBefore / hitBefore（去掉公共 DPS 系数，只看相对时间）
  const tBefore = hpBefore / hitBefore;

  // 后段：buff 覆盖时间 = min(buffDur等价时间, 完整后段时间)
  // 完整后段时间（buff全程覆盖时）= hpAfter / hitAfterBuff
  const tAfterFull = hpAfter / hitAfterBuff;

  // buff 能覆盖多久？受 buffDur 限制。需要把 buffDur 换算成"等价掉血时间"
  // 但 buffDur 是绝对秒数，和 tAfterFull 同量纲（都是相对时间单位，DPS已归一）
  // 实际上 buff 持续 buffDur 秒，在这期间掉血 = DPS × hitAfterBuff × buffDur
  // 后段总HP = hpAfter × HP_total。需引入总战斗时间来定标。
  //
  // 简化：直接用 buffDur 占比。设总战斗时间 T_total，则 buffDur/T_total 是占空比上限。
  // 但 T_total 本身取决于命中率（耦合）。用迭代求解。

  // 迭代法：先假设占空比，算 avgHit，再由 avgHit 反推 T_total，更新占空比，收敛。
  let dutyCycle = buffDur / 600; // 初始猜测（基于600s总时长）
  for (let iter = 0; iter < 50; iter++) {
    const tBuff = dutyCycle; // buff 窗占总时间比
    const tNormal = 1 - tBuff;
    const avgHit = hitBefore * tNormal + hitAfterBuff * tBuff;
    // 由 avgHit 反推总时间：T_total = HP_total / (DPS × avgHit)
    // 归一化 DPS=1, HP=1 → T_total = 1/avgHit
    const T_total = 1 / avgHit;
    // buff 实际覆盖 = min(buffDur, 后段时间)
    // 后段时间占比 = tAfterFull_norm / (tBefore + tAfterFull_norm)
    const tAfterRatio = tAfterFull / (tBefore + tAfterFull);
    const tAfterAbs = tAfterRatio * T_total; // 后段绝对秒数
    const buffCovered = Math.min(buffDur, tAfterAbs);
    dutyCycle = buffCovered / T_total;
  }

  const tBuff = dutyCycle;
  const tNormal = 1 - dutyCycle;
  const avgHit = hitBefore * tNormal + hitAfterBuff * tBuff;
  return { avgHit, hitBefore, hitAfterBuff, dutyCycle };
}

console.log('='.repeat(96));
console.log('临时 buff 加法 vs 乘法 信号差重算【修正占空比: 60%触发剩60%血, 后段慢拉长时间】');
console.log('='.repeat(96));

const ships = [
  { name: '船A d20%', d: 0.20, trigFrac: 0.60, buffDur: 45 }, // 结构<60%触发, 剩60%血, 持续45s
  { name: '船B d25%', d: 0.25, trigFrac: 0.20, buffDur: 40 }, // 结构<20%触发, 剩20%血, 持续40s
];

console.log('\n配置 | 模型 | 前段hit | buff窗hit | 占空比 | 时间加权avgHit');
console.log('-'.repeat(96));
for (const s of ships) {
  for (const model of ['add', 'mul'] as const) {
    const r = simulate(s.d, 0.40, s.trigFrac, s.buffDur, model);
    console.log(
      `${s.name} | ${model === 'add' ? '加法' : '乘法'} |  ${(r.hitBefore * 100).toFixed(1)}% |   ${(r.hitAfterBuff * 100).toFixed(1)}%   | ${(r.dutyCycle * 100).toFixed(1)}% |   ${(r.avgHit * 100).toFixed(2)}%`
    );
  }
  const A = simulate(s.d, 0.40, s.trigFrac, s.buffDur, 'add');
  const M = simulate(s.d, 0.40, s.trigFrac, s.buffDur, 'mul');
  const diff = (A.avgHit - M.avgHit) * 100;
  console.log(`  → 信号差 = ${diff.toFixed(2)}pp   ${diff > 2 ? '✓ >噪声2pp可辨' : diff > 1 ? '~ 边缘' : '✗ 噪声内'}\n`);
}

console.log('='.repeat(96));
console.log('一、为什么这次信号变强了？占空比不再是7.5%');
console.log('='.repeat(96));
console.log('之前错误：占空比 = buffDur/600s = 7.5%（把600s当总时长）');
console.log('修正后：占空比 = buff实际覆盖 / 总时间，由命中率耦合求解');
console.log('');
for (const s of ships) {
  const A = simulate(s.d, 0.40, s.trigFrac, s.buffDur, 'add');
  console.log(`${s.name}: 修正占空比 = ${(A.dutyCycle * 100).toFixed(1)}%（之前算7.5%）`);
}

console.log('\n' + '='.repeat(96));
console.log('二、不同集火规模（压缩总时长）下的信号差');
console.log('='.repeat(96));
console.log('集火压缩总时长 → buffDur占比上升 → 信号放大');
console.log('但 buff 持续固定，总时长太短时 buff 窗可能超过战斗本身（被截断）');
console.log('');
console.log('配置 | 集火(总时长) | 占空比 | 加法avgHit | 乘法avgHit | 信号差 | 可辨?');
console.log('-'.repeat(96));
// 模拟不同总时长：buffDur 不变，但用 dutyCycle 直接控制（buff覆盖=min(buffDur,T)）
// 这里用"假设战斗总时长 T"反推占空比
for (const s of ships) {
  for (const T of [600, 300, 200, 150, 120, 100]) {
    // 占空比 = buff覆盖/T，buff覆盖受后段时间限制
    // 后段时间 = (s.trigFrac / hitAfterBuff) 归一化, 前段 = ((1-s.trigFrac)/hitBefore)
    const hitB = hitAdd(s.d, 0);
    const hitA = hitAdd(s.d, 0.40);
    const tBeforeRel = (1 - s.trigFrac) / hitB;
    const tAfterRel = s.trigFrac / hitA;
    const totalRel = tBeforeRel + tAfterRel;
    // 后段占总时间比
    const afterRatio = tAfterRel / totalRel;
    const tAfterAbs = afterRatio * T;
    const buffCovered = Math.min(s.buffDur, tAfterAbs);
    const duty = buffCovered / T;
    const avgAdd = hitB * (1 - duty) + hitA * duty;
    const hitAm = hitMul(s.d, 0.40);
    const avgMul = hitB * (1 - duty) + hitAm * duty;
    const diff = (avgAdd - avgMul) * 100;
    const verdict = diff > 2 ? '✓' : diff > 1 ? '~' : '✗';
    console.log(`${s.name} | ${String(T).padStart(3)}s (${(600 / T).toFixed(0)}船) | ${(duty * 100).toFixed(0).padStart(2)}% |   ${(avgAdd * 100).toFixed(1)}%   |   ${(avgMul * 100).toFixed(1)}%   | ${diff.toFixed(1)}pp |  ${verdict}`);
  }
  console.log('');
}

console.log('='.repeat(96));
console.log('三、信号最强的配置组合');
console.log('='.repeat(96));
console.log('找【占空比最大 + 不撞底】的组合：');
console.log('');
let best = { name: '', diff: 0, duty: 0, T: 0, avgAdd: 0, avgMul: 0 };
for (const s of ships) {
  for (const T of [600, 400, 300, 250, 200, 180, 150, 120, 100, 90, 80]) {
    const hitB = hitAdd(s.d, 0);
    const hitA = hitAdd(s.d, 0.40);
    const tBeforeRel = (1 - s.trigFrac) / hitB;
    const tAfterRel = s.trigFrac / hitA;
    const totalRel = tBeforeRel + tAfterRel;
    const afterRatio = tAfterRel / totalRel;
    const tAfterAbs = afterRatio * T;
    const buffCovered = Math.min(s.buffDur, tAfterAbs);
    const duty = buffCovered / T;
    const avgAdd = hitB * (1 - duty) + hitA * duty;
    const hitAm = hitMul(s.d, 0.40);
    const avgMul = hitB * (1 - duty) + hitAm * duty;
    const diff = Math.abs(avgAdd - avgMul) * 100;
    if (diff > best.diff) {
      best = { name: s.name, diff, duty: duty * 100, T, avgAdd: avgAdd * 100, avgMul: avgMul * 100 };
    }
  }
}
console.log(`最优: ${best.name}, 总时长${best.T}s → 占空比${best.duty.toFixed(0)}%, 加法${best.avgAdd.toFixed(1)}% vs 乘法${best.avgMul.toFixed(1)}%, 信号差${best.diff.toFixed(1)}pp`);

console.log('\n' + '='.repeat(96));
console.log('四、所需场次估算（信噪比）');
console.log('='.repeat(96));
console.log('单场噪声 ≈ ±2pp。N场平均噪声 ≈ 2/√N');
console.log('要 3σ 显著（信号/噪声>3）需: N > (2×3/信号差)²');
console.log('');
for (const diff of [1.0, 1.5, 2.0, 3.0, 4.0]) {
  const N = Math.ceil((2 * 3 / diff) ** 2);
  console.log(`信号差 ${diff.toFixed(1)}pp → 需 ${N} 场达到3σ显著`);
}
