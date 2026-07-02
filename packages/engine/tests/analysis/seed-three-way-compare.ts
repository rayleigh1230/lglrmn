/**
 * ★ 三方对比：同ID连续两场 vs 异ID场（H_id 终极裁决）★
 *
 *   今天场1 (today1, bid=...264268) ──┐ 同舰队ID连续 → 预测:逐点相同
 *   今天场2 (today2, bid=...64537) ──┘
 *   昨天场 (battle_report, bid=...553577) ── 异ID → 预测:不同
 *
 *   若 today1=today2 (100%) 且 today1≠昨天 → H_id 锁定
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const BASE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../data/client');
const PER_HIT = 930;

function loadHits(file: string): number[] {
  if (!fs.existsSync(file)) return [];
  const txt = fs.readFileSync(file, 'utf-8');
  let data: any; try { data = JSON.parse(txt); } catch { data = eval('(' + txt + ')'); }
  const blocks = Object.values(data)[0] as any[];
  const hpStr: string = blocks.find((b: any) => typeof b === 'string' && b.includes('#'));
  const hp = hpStr.split('#').filter((s) => s.trim()).map((s) => s.split(','))
    .map((p) => ({ type: +p[0], t: +p[1], struct: +p[2] })).filter((p) => p.type === 5);
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

const today1 = loadHits(path.join(BASE, 'battle_report_today1/enemy_battle_data_decoded.txt'));
const today2 = loadHits(path.join(BASE, 'battle_report_today2/enemy_battle_data_decoded.txt'));
const yesterday = loadHits(path.join(BASE, 'battle_report/enemy_battle_data_decoded.txt'));

function sameRate(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i++) if (a[i] === b[i]) s++;
  return { same: s, total: n, rate: s / n };
}

console.log('='.repeat(70));
console.log('★ H_id 终极裁决：三方对比');
console.log('='.repeat(70));
console.log(`\n  场次           区间数  总命中`);
console.log(`  今天场1        ${today1.length}     ${today1.reduce((a, b) => a + b, 0)}`);
console.log(`  今天场2(同ID)  ${today2.length}     ${today2.reduce((a, b) => a + b, 0)}`);
console.log(`  昨天场(异ID)   ${yesterday.length}     ${yesterday.reduce((a, b) => a + b, 0)}`);

const t1t2 = sameRate(today1, today2);
const t1y = sameRate(today1, yesterday);
const t2y = sameRate(today2, yesterday);

console.log(`\n  ${'对比'.padEnd(28)}${'相同区间'.padStart(10)}${'相同率'.padStart(10)}`);
console.log(`  ${'-' .repeat(48)}`);
console.log(`  今天场1 vs 今天场2(同ID)   ${String(t1t2.same + '/' + t1t2.total).padStart(10)}${(t1t2.rate * 100).toFixed(2).padStart(9)}%`);
console.log(`  今天场1 vs 昨天(异ID)      ${String(t1y.same + '/' + t1y.total).padStart(10)}${(t1y.rate * 100).toFixed(2).padStart(9)}%`);
console.log(`  今天场2 vs 昨天(异ID)      ${String(t2y.same + '/' + t2y.total).padStart(10)}${(t2y.rate * 100).toFixed(2).padStart(9)}%`);

console.log('\n  前40区间并排:');
console.log(`  今天1: ${today1.slice(0, 40).map((h) => String(h).padStart(2)).join(' ')}`);
console.log(`  今天2: ${today2.slice(0, 40).map((h) => String(h).padStart(2)).join(' ')}`);
console.log(`  昨天:  ${yesterday.slice(0, 40).map((h) => String(h).padStart(2)).join(' ')}`);

console.log('\n' + '='.repeat(70));
console.log('★ 裁决');
console.log('='.repeat(70));
if (t1t2.rate === 1 && t1y.rate < 0.9 && t2y.rate < 0.9) {
  console.log('\n  ✅✅✅ H_id 完全锁定');
  console.log(`     同舰队ID连续两场: 逐5秒命中序列 100% 逐点相同 (${t1t2.same}/${t1t2.total})`);
  console.log(`     异舰队ID场:        仅 ${(t1y.rate * 100).toFixed(1)}% 相同 (随机水平)`);
  console.log('\n  结论: 战斗随机种子 = 舰队标识符。');
  console.log('        同ID→同种子→同命中序列(可复现); 异ID→不同种子→不同序列。');
  console.log('        "固定种子现象"真相大白: 就是逐发roll + 种子=舰队ID, 无特殊确定算法。');
} else {
  console.log(`\n  结果未达预期, 需复核: t1t2=${(t1t2.rate * 100).toFixed(1)}% t1y=${(t1y.rate * 100).toFixed(1)}%`);
}
