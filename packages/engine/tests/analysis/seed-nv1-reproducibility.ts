/**
 * NV1确定性研究：单场HP曲线的内部结构分析（2混沌 vs 1航母）
 *
 * 数据通道：
 *   enemy_battle_data HP曲线 = 2艘混沌对航母的【合计】伤害，5秒采样
 *   主炮perHit=930(1200-270)，副炮perHit=2(保底)
 *
 * 本研究目标：
 *   1. 验证单场伤害的离散结构（每5秒主炮命中数 = 整数）
 *   2. 提取完整的"逐5秒命中发数序列"——这是同配置重跑对比的基准指纹
 *   3. 分析该序列的统计特征（自相关/游程），为区分候选机制做准备
 *
 * 注意：本脚本只处理单场。等用户dump到同配置第二场后，对比两场序列即可判确定性。
 *
 * 用法：npx tsx tests/analysis/seed-nv1-reproducibility.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const BASE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../data/client');
const PER_HIT = 930;

function loadHP(file: string): { type: number; t: number; struct: number; atkStruct: number }[] {
  const txt = fs.readFileSync(file, 'utf-8');
  let data: any;
  try { data = JSON.parse(txt); } catch { data = eval('(' + txt + ')'); }
  const blocks = Object.values(data)[0] as any[];
  const hpStr: string = blocks.find((b: any) => typeof b === 'string' && b.includes('#'));
  return hpStr.split('#').filter((s) => s.trim()).map((s) => s.split(','))
    .map((p) => ({ type: +p[0], t: +p[1], struct: +p[2], atkStruct: +p[3] }));
}

interface Row { t0: number; t1: number; dStruct: number; mainHits: number; subResidue: number; }

function extract(hp: ReturnType<typeof loadHP>): Row[] {
  const samples = hp.filter((p) => p.type === 5);
  const out: Row[] = [];
  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1], cur = samples[i];
    const dStruct = prev.struct - cur.struct;
    if (dStruct <= 0) { out.push({ t0: prev.t, t1: cur.t, dStruct: 0, mainHits: 0, subResidue: 0 }); continue; }
    let bestN = Math.round(dStruct / PER_HIT);
    let bestR = dStruct - bestN * PER_HIT;
    for (const n of [bestN, bestN - 1, bestN + 1, bestN - 2, bestN + 2]) {
      if (n < 0) continue;
      const r = dStruct - n * PER_HIT;
      if (r >= 0 && r % 2 === 0) { bestN = n; bestR = r; break; }
    }
    out.push({ t0: prev.t, t1: cur.t, dStruct, mainHits: bestN, subResidue: bestR });
  }
  return out;
}

function analyze(label: string, file: string) {
  console.log('\n' + '='.repeat(70));
  console.log(`【${label}】`);
  console.log('='.repeat(70));
  const rows = extract(loadHP(file));
  const killIdx = rows.length; // 击毁在最后一个采样后

  // 基本对账
  const totalMain = rows.reduce((s, r) => s + r.mainHits, 0);
  const totalSub = rows.reduce((s, r) => s + r.subResidue, 0);
  console.log(`\n  总主炮命中: ${totalMain}发 × ${PER_HIT} = ${totalMain * PER_HIT}`);
  console.log(`  总副炮残差: ${totalSub} (= 副炮发数×2)`);
  console.log(`  合计伤害: ${totalMain * PER_HIT + totalSub}`);
  console.log(`  航母总结构: 370192, 差额: ${370192 - (totalMain * PER_HIT + totalSub)}`);

  // 命中发数序列
  const hits = rows.map((r) => r.mainHits);
  console.log(`\n  逐5秒主炮命中发数序列 (共${hits.length}个区间):`);
  for (let i = 0; i < hits.length; i += 20) {
    console.log(`    [t${rows[i].t0}-${rows[Math.min(i + 19, rows.length - 1)].t1}] ` + hits.slice(i, i + 20).join(' '));
  }

  // 分布
  const dist = new Map<number, number>();
  for (const h of hits) dist.set(h, (dist.get(h) ?? 0) + 1);
  console.log(`\n  命中发数分布:`);
  for (const k of [...dist.keys()].sort((a, b) => a - b)) {
    console.log(`    ${k}发: ${dist.get(k)}次 (${(dist.get(k)! / hits.length * 100).toFixed(1)}%)`);
  }
  const avgHits = totalMain / hits.length;
  console.log(`\n  平均每5秒命中: ${avgHits.toFixed(3)}发`);
  console.log(`  → 每秒命中率: ${(avgHits / 5).toFixed(3)}发/秒`);

  // ===== 主炮总开火数反推 =====
  // N=2艘混沌，每艘每周期2发主炮(弹药2×次数1)，CD=8.4s
  // 每5秒每艘开火 = 2发 × 5/8.4 = 1.19发，两艘 = 2.38发
  // 命中率 p = 平均命中/平均开火
  const firePerShipPer5s = 2 * 5 / 8.4;
  const totalFirePer5s = firePerShipPer5s * 2;
  console.log(`\n  主炮开火数反推:`);
  console.log(`    每艘每5秒开火: ${firePerShipPer5s.toFixed(3)}发 (2发/周期 × 5/8.4)`);
  console.log(`    两艘每5秒开火: ${totalFirePer5s.toFixed(3)}发`);
  console.log(`    反推命中率 p = ${avgHits.toFixed(3)} / ${totalFirePer5s.toFixed(3)} = ${(avgHits / totalFirePer5s * 100).toFixed(2)}%`);

  return { hits, rows, totalMain, totalSub };
}

// ===== 运行两场（注意：配置不同，只做单场结构分析，不做可复现性对比） =====
const buff = analyze('有加成场 (+25%命中)', path.join(BASE, 'battle_report/enemy_battle_data_decoded.txt'));
const nobuff = analyze('无加成场', path.join(BASE, 'battle_report_nobuff/enemy_battle_data_decoded.txt'));

// ===== 统计特征对比（仅命中率不同的两场，看序列结构是否同型） =====
console.log('\n\n' + '='.repeat(70));
console.log('★ 序列统计特征对比（两场命中率不同，但都是N=2单靶确定性场景）');
console.log('='.repeat(70));

function stats(hits: number[]) {
  const n = hits.length;
  const mean = hits.reduce((a, b) => a + b, 0) / n;
  const variance = hits.reduce((s, h) => s + (h - mean) ** 2, 0) / n;
  // 自相关 lag=1 (相邻区间命中数的相关性)
  let cov = 0;
  for (let i = 0; i < n - 1; i++) cov += (hits[i] - mean) * (hits[i + 1] - mean);
  cov /= (n - 1);
  const autocorr1 = cov / variance;
  // 游程分析（连续相同发数的段长）
  const runs: number[] = [];
  let runLen = 1;
  for (let i = 1; i < hits.length; i++) {
    if (hits[i] === hits[i - 1]) runLen++;
    else { runs.push(runLen); runLen = 1; }
  }
  runs.push(runLen);
  return { mean, std: Math.sqrt(variance), autocorr1, avgRun: runs.reduce((a, b) => a + b, 0) / runs.length };
}

const sb = stats(buff.hits);
const sn = stats(nobuff.hits);
console.log(`\n  指标                  有加成        无加成`);
console.log(`  ${'-' .repeat(50)}`);
console.log(`  均值(发/5秒)        ${sb.mean.toFixed(3).padStart(12)} ${sn.mean.toFixed(3).padStart(12)}`);
console.log(`  标准差               ${sb.std.toFixed(3).padStart(12)} ${sn.std.toFixed(3).padStart(12)}`);
console.log(`  lag1自相关           ${sb.autocorr1.toFixed(3).padStart(12)} ${sn.autocorr1.toFixed(3).padStart(12)}`);
console.log(`  平均游程长度         ${sb.avgRun.toFixed(3).padStart(12)} ${sn.avgRun.toFixed(3).padStart(12)}`);

console.log(`\n  解读:`);
console.log(`  - lag1自相关≈0 → 命中数无相邻相关性(每5秒独立)，排除"周期性累加器"`);
console.log(`  - lag1自相关<0 → 有均值回归倾向(打多发后少打)，暗示某种配额机制`);
console.log(`  - lag1自相关>0 → 有持续性(趋势)，暗示集群命中`);
