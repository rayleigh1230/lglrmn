/**
 * 固定种子核心证据：逐5秒主炮命中发数序列对比
 *
 * 从两份战报HP曲线提取每5秒区间的结构伤害，除以 perHit(930) 得到主炮命中发数。
 * 副炮伤害（保底2/发）残差单独处理。
 *
 * 关键问题：同配置（近似）两场，逐5秒命中发数序列是否相同？
 *   - 若相同 → 强确定性证据（逐时刻复现）
 *   - 若不同 → 命中是随机的，只有"总命中数"由HP物理决定
 *
 * 用法：npx tsx tests/analysis/seed-hitseq-per5s.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const BASE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../data/client');
const PER_HIT = 930; // 主炮轨道炮单发 = 1200 - 270

function loadHP(file: string): { t: number; struct: number; atkStruct: number; type: number }[] {
  const txt = fs.readFileSync(file, 'utf-8');
  let data: any;
  try { data = JSON.parse(txt); } catch { data = eval('(' + txt + ')'); }
  const blocks = Object.values(data)[0] as any[];
  const hpStr: string = blocks.find((b: any) => typeof b === 'string' && b.includes('#'));
  return hpStr.split('#').filter((s) => s.trim()).map((s) => s.split(',')).map((p) => ({
    type: +p[0], t: +p[1], struct: +p[2], atkStruct: +p[3],
  }));
}

interface Interval {
  t0: number; t1: number; dStruct: number; mainHits: number; subResidue: number;
}

/** 把连续采样点切成5秒区间，分解主炮命中数 + 副炮残差 */
function extractIntervals(hp: { type: number; t: number; struct: number }[]): Interval[] {
  const samples = hp.filter((p) => p.type === 5);
  const out: Interval[] = [];
  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1];
    const cur = samples[i];
    const dStruct = prev.struct - cur.struct;
    if (dStruct <= 0) {
      out.push({ t0: prev.t, t1: cur.t, dStruct: 0, mainHits: 0, subResidue: 0 });
      continue;
    }
    // 分解：主炮命中数 = round(dStruct / 930)，但要保证残差 = dStruct - n*930 是2的倍数（副炮保底2/发）
    // 试 n, n-1, n+1 找残差为非负偶数
    let bestN = Math.round(dStruct / PER_HIT);
    let bestResidue = dStruct - bestN * PER_HIT;
    // 残差必须 >=0 且为偶数（副炮每发2）。若不是，微调
    for (const n of [bestN, bestN - 1, bestN + 1, bestN - 2, bestN + 2]) {
      if (n < 0) continue;
      const r = dStruct - n * PER_HIT;
      if (r >= 0 && r % 2 === 0) { bestN = n; bestResidue = r; break; }
    }
    out.push({ t0: prev.t, t1: cur.t, dStruct, mainHits: bestN, subResidue: bestResidue });
  }
  return out;
}

const buff = extractIntervals(loadHP(path.join(BASE, 'battle_report/enemy_battle_data_decoded.txt')));
const nobuff = extractIntervals(loadHP(path.join(BASE, 'battle_report_nobuff/enemy_battle_data_decoded.txt')));

// ===== 前90秒细粒度对比 =====
console.log('='.repeat(80));
console.log('逐5秒主炮命中发数序列（前180秒）');
console.log('='.repeat(80));
console.log(`\n  ${'区间'.padStart(10)}${'有加成Δstruct'.padStart(14)}${'有加成主炮发'.padStart(12)}${'有加成副炮残'.padStart(12)} | ${'无加成Δstruct'.padStart(14)}${'无加成主炮发'.padStart(12)}${'无加成副炮残'.padStart(12)}`);
console.log('  ' + '-'.repeat(90));
const N = Math.min(36, Math.min(buff.length, nobuff.length));
for (let i = 0; i < N; i++) {
  const b = buff[i]; const n = nobuff[i];
  console.log(
    `  ${String(b.t0 + '-' + b.t1).padStart(10)}${String(b.dStruct).padStart(14)}${String(b.mainHits).padStart(12)}${String(b.subResidue).padStart(12)} | ${String(n.dStruct).padStart(14)}${String(n.mainHits).padStart(12)}${String(n.subResidue).padStart(12)}`
  );
}

// ===== 全场命中发数序列对比（看是否有相位差） =====
console.log('\n\n' + '='.repeat(80));
console.log('全场主炮命中发数序列（每5秒一发数，前400秒）');
console.log('='.repeat(80));
const buffHits = buff.map((b) => b.mainHits);
const nobuffHits = nobuff.map((b) => b.mainHits);

// 打印成紧凑字符串，每行20个区间
console.log('\n有加成: ' + buffHits.slice(0, 80).map((h) => h.toString().padStart(2)).join(' '));
console.log('无加成: ' + nobuffHits.slice(0, 80).map((h) => h.toString().padStart(2)).join(' '));
console.log('差  :   ' + buffHits.slice(0, 80).map((h, i) => (h - (nobuffHits[i] ?? 0) >= 0 ? '+' : '') + (h - (nobuffHits[i] ?? 0))).map((s) => s.padStart(2)).join(' '));

// ===== 统计：命中发数分布 =====
console.log('\n\n' + '='.repeat(80));
console.log('主炮命中发数分布（每5秒区间内的发数频次）');
console.log('='.repeat(80));
function dist(hits: number[]) {
  const m = new Map<number, number>();
  for (const h of hits) m.set(h, (m.get(h) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => a[0] - b[0]);
}
console.log('\n  发数  有加成  无加成');
const db = new Map(dist(buffHits));
const dn = new Map(dist(nobuffHits));
const allKeys = [...new Set([...db.keys(), ...dn.keys()])].sort((a, b) => a - b);
let bSum = 0, nSum = 0;
for (const k of allKeys) {
  const bv = db.get(k) ?? 0; const nv = dn.get(k) ?? 0;
  bSum += k * bv; nSum += k * nv;
  console.log(`  ${String(k).padStart(4)}  ${String(bv).padStart(6)}  ${String(nv).padStart(6)}`);
}
console.log(`  合计发数: 有加成=${bSum}  无加成=${nSum}`);
console.log(`  区间数:   有加成=${buffHits.length}  无加成=${nobuffHits.length}`);

// ===== 逐点完全相同的比例（确定性度量） =====
console.log('\n\n' + '='.repeat(80));
console.log('★ 确定性度量：逐5秒区间命中发数完全相同的比例');
console.log('='.repeat(80));
let same = 0, diff = 0;
const minLen = Math.min(buffHits.length, nobuffHits.length);
for (let i = 0; i < minLen; i++) {
  if (buffHits[i] === nobuffHits[i]) same++; else diff++;
}
console.log(`  对比区间数: ${minLen}`);
console.log(`  完全相同: ${same} (${(same / minLen * 100).toFixed(1)}%)`);
console.log(`  不同: ${diff} (${(diff / minLen * 100).toFixed(1)}%)`);
console.log(`\n  注: 两场配置不完全相同（混沌结构 93104 vs 91904，强化不同），`);
console.log(`  且"有加成"场航母有+25%命中。若仍逐点相同→极强确定性；不同则反映命中率差异。`);

// ===== 滑动窗口相关性（检测相位偏移） =====
console.log('\n\n' + '='.repeat(80));
console.log('相位偏移检测：不同 offset 下的相同比例');
console.log('='.repeat(80));
console.log('\n  offset  相同区间数  相同率');
for (let off = -5; off <= 5; off++) {
  let s = 0, d = 0;
  for (let i = 0; i < minLen - Math.abs(off); i++) {
    const bi = buffHits[i + (off > 0 ? off : 0)];
    const ni = nobuffHits[i + (off < 0 ? -off : 0)];
    if (bi === ni) s++; else d++;
  }
  const total = s + d;
  console.log(`  ${String(off).padStart(6)}  ${String(s).padStart(8)}  ${(s / total * 100).toFixed(1)}%`);
}
