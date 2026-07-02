/**
 * ★ 同配置重跑可复现性验证（核心裁决脚本）★
 *
 * 这是判定"固定种子现象"本质的决定性工具。
 * 用法：把两份【同配置】战报路径填入下方，运行。
 *
 *   npx tsx tests/analysis/seed-reproducibility-test.ts
 *
 * 判据：
 *   两份战报的"逐5秒主炮命中发数序列"逐点对比：
 *   - 完全相同（100%）→ 强确定性：命中判定是确定机制，可精确复现到5秒级
 *   - 部分相同        → 弱确定性：只有总量复现，时序有随机
 *   - 完全不同        → 无确定性：之前"9场相同"观察需重新评估
 *
 * 进阶：若完全相同，进一步分析序列的"指纹"特征，
 *       为推断具体机制（固定种子roll vs 确定性调度 vs 查表）提供依据。
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const BASE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../data/client');
const PER_HIT = 930;

// ★★★ 把同配置重跑的两份战报路径填这里 ★★★
const FILE_A = path.join(BASE, 'battle_report_today1/enemy_battle_data_decoded.txt');  // 今天场1
const FILE_B = path.join(BASE, 'battle_report_today2/enemy_battle_data_decoded.txt');  // 今天场2(同ID连续)

function loadHits(file: string): { hits: number[]; raw: any } {
  if (!fs.existsSync(file)) return { hits: [], raw: null };
  const txt = fs.readFileSync(file, 'utf-8');
  let data: any; try { data = JSON.parse(txt); } catch { data = eval('(' + txt + ')'); }
  const blocks = Object.values(data)[0] as any[];
  const hpStr: string = blocks.find((b: any) => typeof b === 'string' && b.includes('#'));
  const hp = hpStr.split('#').filter((s) => s.trim()).map((s) => s.split(','))
    .map((p) => ({ type: +p[0], t: +p[1], struct: +p[2], atk: +p[3] })).filter((p) => p.type === 5);
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
  return { hits, raw: hp };
}

const A = loadHits(FILE_A);
const B = loadHits(FILE_B);

if (B.hits.length === 0) {
  console.log('='.repeat(70));
  console.log('同配置重跑验证脚本（等待第2份数据）');
  console.log('='.repeat(70));
  console.log(`\n  当前 FILE_A: ${FILE_A}`);
  console.log(`  当前 FILE_B: ${FILE_B}  ← 待dump，尚未就绪`);
  console.log(`\n  第1场序列(前40): ${A.hits.slice(0, 40).join(' ')}`);
  console.log(`  第1场总命中: ${A.hits.reduce((a, b) => a + b, 0)}发, 区间数${A.hits.length}`);
  console.log(`\n  ★ 等第2份同配置战报dump到 data/client/battle_report_2/ 后重跑本脚本即可自动对比。`);
  console.log(`  ★ 若放别的目录，修改顶部 FILE_B 路径即可。`);
  process.exit(0);
}

// ===== 逐点对比 =====
console.log('='.repeat(70));
console.log('★ 同配置重跑可复现性验证');
console.log('='.repeat(70));
console.log(`\n  FILE_A: ${FILE_A}`);
console.log(`  FILE_B: ${FILE_B}`);

const minLen = Math.min(A.hits.length, B.hits.length);
let same = 0;
const diffs: { i: number; a: number; b: number }[] = [];
for (let i = 0; i < minLen; i++) {
  if (A.hits[i] === B.hits[i]) same++;
  else diffs.push({ i, a: A.hits[i], b: B.hits[i] });
}
const sameRate = same / minLen;
console.log(`\n  对比区间数: ${minLen}`);
console.log(`  完全相同: ${same} / ${minLen} = ${(sameRate * 100).toFixed(2)}%`);
console.log(`  不同: ${diffs.length}`);

// 序列并排
console.log(`\n  前60个5秒区间并排对比:`);
console.log(`  A: ${A.hits.slice(0, 60).map((h) => String(h).padStart(2)).join(' ')}`);
console.log(`  B: ${B.hits.slice(0, 60).map((h) => String(h).padStart(2)).join(' ')}`);
const diffMark = A.hits.slice(0, 60).map((h, i) => (h === B.hits[i] ? ' ·' : ' ✗')).join(' ');
console.log(`     ${diffMark}`);

if (diffs.length > 0 && diffs.length <= 50) {
  console.log(`\n  差异明细 (前30个):`);
  for (const d of diffs.slice(0, 30)) {
    console.log(`    区间#${d.i} (t=${d.i * 5}~${d.i * 5 + 5}s): A=${d.a} B=${d.b} 差=${d.a - d.b}`);
  }
}

// ===== 裁决 =====
console.log('\n' + '='.repeat(70));
console.log('★ 裁决');
console.log('='.repeat(70));
if (sameRate === 1) {
  console.log('\n  ✅ 100%逐点相同 → 命中判定是【强确定机制】');
  console.log('     可复现精度达5秒级。下一步：分析序列指纹推断具体机制。');
} else if (sameRate >= 0.95) {
  console.log(`\n  ⚠️ ${(sameRate * 100).toFixed(1)}%相同 → 近似确定，但有少量差异`);
  console.log('     差异可能来自：采样边界/副炮残差干扰/轻微配置差异');
  console.log('     需检查差异点的物理合理性');
} else if (sameRate >= 0.7) {
  console.log(`\n  ⚠️ ${(sameRate * 100).toFixed(1)}%相同 → 弱确定性`);
  console.log('     时序有随机成分，但总量复现。可能是"固定种子+某种调度"');
} else {
  console.log(`\n  ❌ 仅${(sameRate * 100).toFixed(1)}%相同 → 时序不可复现`);
  console.log('     确定性只在"总命中数/总伤害"层面，5秒级时序是随机的');
  console.log('     → 命中判定是真随机roll，之前的"逐元素相同"精度需重新评估');
}

// 总量复现性
const sumA = A.hits.reduce((a, b) => a + b, 0);
const sumB = B.hits.reduce((a, b) => a + b, 0);
console.log(`\n  总命中复现: A=${sumA}发 B=${sumB}发 差=${Math.abs(sumA - sumB)}`);
console.log(`  ${Math.abs(sumA - sumB) <= 1 ? '→ 总量精确复现（物理必然：HP/perHit）' : '→ 总量有差异（配置可能不同）'}`);
