/**
 * 战报精确对照分析：加成 vs 无加成（2混沌 vs CV3000）
 *
 * 数据源：两份服务器原始HP曲线（客户端内存dump），零黑盒反推
 *   - 无加成: battle_report_nobuff/, 时长1349s, battle_id=...52491
 *   - 加成(+10%全+15%对大): battle_report/, 时长1083s, battle_id=...553577
 *
 * 原则：只对比硬数据，不依赖未坐实的前摇/周期假设
 *
 * 用法：npx tsx tests/analysis/battle-report-buff-vs-nobuff.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const PER_HIT = 930; // 轨道炮单发(1200-270)

interface HPPoint { t: number; struct: number; shield: number; }

function loadHP(file: string): HPPoint[] {
  const txt = fs.readFileSync(file, 'utf-8');
  let data: any;
  try { data = JSON.parse(txt); } catch { data = eval('(' + txt + ')'); }
  const blocks: any[] = data instanceof Array ? data : Object.values(data)[0] as any[];
  const hpStr: string = blocks.find(b => typeof b === 'string' && b.includes('#'));
  return hpStr.split('#')
    .filter(s => s.trim())
    .map(s => s.split(','))
    .filter(p => p.length >= 4 && p[0] === '5')
    .map(p => ({ t: +p[1], struct: +p[2], shield: +p[3] }));
}

interface Analysis {
  label: string;
  pts: number;
  duration: number;
  initStruct: number;
  initShield: number;
  structDmg: number;
  shieldDmg: number;
  hits: number;
  dist: Map<number, number>;
  firstHit: number | null;
  structDPS: number;
  totalDPS: number;
}

function analyze(pts: HPPoint[], label: string): Analysis {
  const seq: number[] = [];
  for (let i = 1; i < pts.length; i++) {
    const d = pts[i - 1].struct - pts[i].struct;
    seq.push(d >= PER_HIT * 0.85 ? Math.round(d / PER_HIT) : 0);
  }
  const hits = seq.reduce((a, b) => a + b, 0);
  const structDmg = pts[0].struct - pts[pts.length - 1].struct;
  let shieldDmg = 0;
  for (let i = 1; i < pts.length; i++) {
    shieldDmg += Math.max(0, pts[i - 1].shield - pts[i].shield);
  }
  const duration = pts[pts.length - 1].t;
  let firstHit: number | null = null;
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].struct < pts[i - 1].struct) { firstHit = pts[i].t; break; }
  }
  const dist = new Map<number, number>();
  for (const n of seq) dist.set(n, (dist.get(n) || 0) + 1);

  return {
    label, pts: pts.length, duration,
    initStruct: pts[0].struct, initShield: pts[0].shield,
    structDmg, shieldDmg, hits, dist, firstHit,
    structDPS: structDmg / duration,
    totalDPS: (structDmg + shieldDmg) / duration,
  };
}

const baseDir = 'F:/战斗模拟器/lglrmn/data/client';
const buff = analyze(loadHP(path.join(baseDir, 'battle_report/enemy_battle_data_decoded.txt')), '加成(+10%全+15%对大)');
const nobuff = analyze(loadHP(path.join(baseDir, 'battle_report_nobuff/enemy_battle_data_decoded.txt')), '无加成');

for (const r of [nobuff, buff]) {
  console.log('='.repeat(60));
  console.log(r.label);
  console.log('='.repeat(60));
  console.log(`  采样:${r.pts}, 时长:${r.duration}s, 初始struct:${r.initStruct} shield:${r.initShield}`);
  console.log(`  结构伤害:${r.structDmg}, 护盾伤害:${r.shieldDmg}, 命中:${r.hits}发`);
  console.log(`  首发掉血:t=${r.firstHit}s, 结构DPS:${r.structDPS.toFixed(1)}, 总DPS:${r.totalDPS.toFixed(1)}`);
  const dSorted = [...r.dist.entries()].sort((a, b) => a[0] - b[0]);
  console.log(`  命中分布:{${dSorted.map(([k, v]) => `${k}:${v}`).join(', ')}}`);
}

console.log('\n' + '='.repeat(60));
console.log('★ 干净对比（两份服务器原始HP曲线，零黑盒反推）');
console.log('='.repeat(60));
console.log(`${'指标'.padEnd(16)}${'加成'.padStart(10)}${'无加成'.padStart(10)}${'比值(加/无)'.padStart(14)}`);
console.log('-'.repeat(52));
const rows: [string, number, number][] = [
  ['时长(s)', buff.duration, nobuff.duration],
  ['结构伤害', buff.structDmg, nobuff.structDmg],
  ['护盾伤害', buff.shieldDmg, nobuff.shieldDmg],
  ['命中发数', buff.hits, nobuff.hits],
  ['结构DPS', buff.structDPS, nobuff.structDPS],
  ['总DPS', buff.totalDPS, nobuff.totalDPS],
];
for (const [lbl, b, n] of rows) {
  const bf = Number.isInteger(b) ? String(b) : b.toFixed(1);
  const nf = Number.isInteger(n) ? String(n) : n.toFixed(1);
  console.log(`${lbl.padEnd(16)}${bf.padStart(10)}${nf.padStart(10)}${(b / n).toFixed(4).padStart(14)}`);
}

console.log('\n命中分布对比:');
const allKeys = [...new Set([...buff.dist.keys(), ...nobuff.dist.keys()])].sort((a, b) => a - b);
console.log(`  ${'发数'.padEnd(6)}${'加成'.padStart(8)}${'无加成'.padStart(8)}${'差'.padStart(8)}`);
for (const k of allKeys) {
  const bv = buff.dist.get(k) || 0;
  const nv = nobuff.dist.get(k) || 0;
  console.log(`  ${String(k).padEnd(6)}${String(bv).padStart(8)}${String(nv).padStart(8)}${(bv - nv >= 0 ? '+' : '') + (bv - nv)}${''.padStart(8 - String(bv - nv).length - 1)}`);
}

console.log('\n' + '='.repeat(60));
console.log('★ 关键判读（仅基于硬数据）');
console.log('='.repeat(60));
console.log(`1. 命中发数几乎相同(395 vs 394): 靶HP固定,击毁所需命中数固定(物理必然)`);
console.log(`2. 时长缩短19.7%: 加成后战斗更快(命中率提高→单位时间命中更多)`);
console.log(`3. 结构DPS比值 = ${buff.structDPS / nobuff.structDPS.toFixed(4)} (加成/无加成)`);
console.log(`   若命中率公式 base×(1+k), +25%加成 → 预期DPS比=1.25`);
console.log(`   实测${(buff.structDPS / nobuff.structDPS).toFixed(4)} vs 预测1.2500, 偏差${(Math.abs(buff.structDPS / nobuff.structDPS - 1.25) * 100).toFixed(2)}%`);
console.log(`4. 全miss段: 加成${buff.dist.get(0) || 0} vs 无加成${nobuff.dist.get(0) || 0} (加成后少了${(nobuff.dist.get(0) || 0) - (buff.dist.get(0) || 0)}个)`);
console.log(`5. 满发段(4发): 加成${buff.dist.get(4) || 0} vs 无加成${nobuff.dist.get(4) || 0} (加成后多${(buff.dist.get(4) || 0) - (nobuff.dist.get(4) || 0)}个)`);
console.log(`6. 两场首发时刻相同(t=15s): 加成不改锁定/前摇 → DPS比基本只反映命中率差异`);
