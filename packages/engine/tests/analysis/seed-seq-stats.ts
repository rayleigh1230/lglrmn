/**
 * 命中序列深层统计：负自相关机制判定
 *
 * 上一轮发现 lag1 自相关 ≈ -0.6（强负值），暗示"打多发后少打"的配额机制。
 * 本脚本深入验证：
 *   1. 多阶自相关（lag1~lag5）—看负相关的持续性和衰减
 *   2. 条件分布：当前发=0/1/2/3/4 时，下一5秒的分布 —直接看"补偿"现象
 *   3. 与"每周期2发"结构的对照：2艘×2发=4发/周期，命中率~0.76/0.61
 *
 * 用法：npx tsx tests/analysis/seed-seq-stats.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const BASE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../data/client');
const PER_HIT = 930;

function loadHP(file: string) {
  const txt = fs.readFileSync(file, 'utf-8');
  let data: any; try { data = JSON.parse(txt); } catch { data = eval('(' + txt + ')'); }
  const blocks = Object.values(data)[0] as any[];
  const hpStr: string = blocks.find((b: any) => typeof b === 'string' && b.includes('#'));
  return hpStr.split('#').filter((s) => s.trim()).map((s) => s.split(','))
    .map((p) => ({ type: +p[0], t: +p[1], struct: +p[2] }));
}

function extractHits(file: string): number[] {
  const hp = loadHP(file).filter((p) => p.type === 5);
  const hits: number[] = [];
  for (let i = 1; i < hp.length; i++) {
    const d = hp[i - 1].struct - hp[i].struct;
    if (d <= 0) { hits.push(0); continue; }
    let n = Math.round(d / PER_HIT);
    for (const cand of [n, n - 1, n + 1, n - 2, n + 2]) {
      if (cand >= 0 && d - cand * PER_HIT >= 0 && (d - cand * PER_HIT) % 2 === 0) { n = cand; break; }
    }
    hits.push(n);
  }
  return hits;
}

function report(label: string, file: string) {
  const hits = extractHits(file);
  const n = hits.length;
  const mean = hits.reduce((a, b) => a + b, 0) / n;

  console.log('\n' + '='.repeat(70));
  console.log(`【${label}】 n=${n} 均值=${mean.toFixed(3)}`);
  console.log('='.repeat(70));

  // 1. 多阶自相关
  const variance = hits.reduce((s, h) => s + (h - mean) ** 2, 0) / n;
  console.log('\n  多阶自相关:');
  for (let lag = 1; lag <= 6; lag++) {
    let cov = 0; let cnt = 0;
    for (let i = 0; i < n - lag; i++) { cov += (hits[i] - mean) * (hits[i + lag] - mean); cnt++; }
    const acf = cov / cnt / variance;
    const bar = '█'.repeat(Math.round(Math.abs(acf) * 30));
    console.log(`    lag${lag}: ${acf.toFixed(3).padStart(7)}  ${acf >= 0 ? '+' : '-'}${bar}`);
  }

  // 2. 条件分布：P(next | current)
  console.log('\n  条件分布 P(下一5秒发数 | 当前5秒发数):');
  const conds = new Map<number, number[]>();
  for (let i = 0; i < n - 1; i++) {
    if (!conds.has(hits[i])) conds.set(hits[i], []);
    conds.get(hits[i])!.push(hits[i + 1]);
  }
  const allVals = [...conds.keys()].sort((a, b) => a - b);
  console.log(`    ${'当前\\下'.padEnd(8)}${'均值'.padStart(8)}${allVals.map((v) => String(v).padStart(7)).join('')}`);
  for (const cur of allVals) {
    const nexts = conds.get(cur)!;
    const nextMean = nexts.reduce((a, b) => a + b, 0) / nexts.length;
    const nextDist = new Map<number, number>();
    for (const x of nexts) nextDist.set(x, (nextDist.get(x) ?? 0) + 1);
    const distStr = allVals.map((v) => String(nextDist.get(v) ?? 0).padStart(7)).join('');
    console.log(`    ${String(cur).padEnd(8)}${nextMean.toFixed(2).padStart(8)}${distStr}  (n=${nexts.length})`);
  }
  const overallMean = mean;
  console.log(`\n    全局均值 = ${overallMean.toFixed(3)}`);
  console.log(`    若无条件独立 → 各行的"均值"列应都≈全局均值`);
  console.log(`    若"当前多发→下个少发" → 当前值大的行，均值列偏小（负相关/补偿）`);

  // 3. 关键判据：实测条件均值 vs 独立假设的理论值
  console.log('\n  ★ 补偿效应量化:');
  console.log(`    ${'当前发数'.padEnd(10)}${'实测下一均值'.padStart(14)}${'偏离全局均值'.padStart(16)}`);
  for (const cur of allVals) {
    const nexts = conds.get(cur)!;
    const nextMean = nexts.reduce((a, b) => a + b, 0) / nexts.length;
    const dev = nextMean - overallMean;
    console.log(`    ${String(cur).padEnd(10)}${nextMean.toFixed(3).padStart(14)}${(dev >= 0 ? '+' : '') + dev.toFixed(3).padStart(15)}`);
  }

  // 4. 与"真随机roll"的理论分布对比
  // N=2，每周期4发(2艘×2发)，CD=8.4s，5秒内平均开火 = 4×5/8.4 = 2.381发
  // 但实际5秒窗口与8.4周期不对齐，开火数本身是离散的(0,2,4发为主)
  console.log('\n  与"真随机roll"对比:');
  const firePer5s = 4 * 5 / 8.4;
  const p = mean / firePer5s;
  console.log(`    反推命中率 p = ${mean.toFixed(3)} / ${firePer5s.toFixed(3)} = ${(p * 100).toFixed(2)}%`);
  // 真随机下，每5秒命中数 ~ Binomial(开火数, p)，但开火数因周期不对齐而波动
  // 关键：真随机的 lag1 自相关应≈0（各5秒窗口独立）
  // 实测 lag1 ≈ -0.6 → 强烈拒绝纯独立roll

  return { hits, mean, p };
}

const buff = report('有加成 (+25%)', path.join(BASE, 'battle_report/enemy_battle_data_decoded.txt'));
const nobuff = report('无加成', path.join(BASE, 'battle_report_nobuff/enemy_battle_data_decoded.txt'));

// ===== 总结判读 =====
console.log('\n\n' + '='.repeat(70));
console.log('★ 综合判读');
console.log('='.repeat(70));
console.log(`
  发现1: lag1 自相关 强负值 (-0.62 / -0.53)
    → "当前5秒打多发，下一个5秒倾向少打" — 强补偿效应
    → 直接排除"每5秒独立真随机roll"（独立roll的lag1必≈0）

  发现2: 条件均值随当前发数单调下降
    → 这是"配额/补偿"机制的指纹，不是独立roll

  发现3: 两场(不同命中率)都呈现相同结构的负自相关
    → 这个负相关是【机制本身的性质】，不随命中率改变
    → 暗示存在一个"目标命中数"被分配到各个时间窗口

  候选机制（待同配置重跑数据验证）:
    a) Bresenham/累加器：把总命中数均匀分配到时间轴 → 但04文档说"每轮命中数波动"已排除纯累加器
    b) 分层采样：每艘舰的开火被确定性调度，2艘的相位关系固定
    c) 固定种子的真roll：种子确定→序列确定→但相邻独立(无负相关)→与发现1矛盾!

  ★ 关键矛盾: 若是"固定种子的独立roll"，lag1应≈0；实测-0.6说明有【时间相关结构】
    → 固定种子roll 解释不了负自相关
    → 更可能是"确定性调度"(2艘船开火相位固定 + 命中判定确定)
`);
