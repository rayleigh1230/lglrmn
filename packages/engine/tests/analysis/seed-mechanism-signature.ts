/**
 * 剥离运动学伪影后的"命中机制信号"提取
 *
 * 上一轮证明：负自相关主要是CD(8.4s)与采样(5s)的干涉，不是命中机制。
 * 但"全命中"模型的序列是 4/0/4/0... 或 4/2/2/2...（规整），
 * 实测是 4/2/2/3/0/3/2...（有波动）。
 *
 * 这个"波动"才是命中判定机制的真正信号！本脚本量化它：
 *   1. 残差序列 = 实测命中数 - 全命中模型的开火数（应≤0，表示未命中的损耗）
 *   2. 残差的统计特征（是否像独立roll的损耗？是否有时间结构？）
 *
 * 关键判据：
 *   - 若残差是"独立伯努利损耗" → 每发独立判定，lag1≈0 → 支持"固定种子独立roll"
 *   - 若残差有时间结构 → 命中判定非独立 → 支持某种确定性规则
 *
 * 用法：npx tsx tests/analysis/seed-mechanism-signature.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const BASE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../data/client');
const PER_HIT = 930;

function loadHits(file: string): number[] {
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
    for (const cand of [n, n - 1, n + 1]) {
      if (cand >= 0 && d - cand * PER_HIT >= 0 && (d - cand * PER_HIT) % 2 === 0) { n = cand; break; }
    }
    hits.push(n);
  }
  return hits;
}

/** 模拟全命中的开火数序列（2艘船，可配相位） */
function fireModel(duration: number, cd: number, shotsPerCycle: number, t0: number, phaseOffsets: number[]) {
  const windows: number[] = [];
  for (let wStart = 0; wStart < duration; wStart += 5) {
    let count = 0;
    for (let s = 0; s < phaseOffsets.length; s++) {
      const phase = t0 + phaseOffsets[s];
      for (let cycle = 0; ; cycle++) {
        const ft = phase + cycle * cd;
        if (ft >= wStart + 5) break;
        if (ft >= wStart) count += shotsPerCycle;
      }
    }
    windows.push(count);
  }
  return windows;
}

function acf(xs: number[], lag: number) {
  const n = xs.length;
  const mean = xs.reduce((a, b) => a + b, 0) / n;
  const variance = xs.reduce((s, h) => s + (h - mean) ** 2, 0) / n;
  if (variance === 0) return 0;
  let cov = 0; let cnt = 0;
  for (let i = 0; i < n - lag; i++) { cov += (xs[i] - mean) * (xs[i + lag] - mean); cnt++; }
  return cov / cnt / variance;
}

function analyze(label: string, file: string) {
  console.log('\n' + '='.repeat(70));
  console.log(`【${label}】`);
  console.log('='.repeat(70));
  const hits = loadHits(file);
  const totalHits = hits.reduce((a, b) => a + b, 0);
  const fire = fireModel(1100, 8.4, 2, 15, [0, 0]); // 同相位假设
  const minLen = Math.min(hits.length, fire.length);

  // 残差 = 开火数 - 命中数 = 未命中数（应≥0）
  const miss: number[] = [];
  console.log(`\n  前40个5秒窗口:`);
  console.log(`  ${'窗口'.padStart(6)}${'开火(全命中模型)'.padStart(16)}${'实测命中'.padStart(10)}${'未命中(残差)'.padStart(14)}`);
  let totalFire = 0, totalMiss = 0;
  for (let i = 0; i < Math.min(40, minLen); i++) {
    const m = fire[i] - hits[i];
    miss.push(m);
    totalFire += fire[i]; totalMiss += m;
    if (i < 40) console.log(`  ${String(i).padStart(6)}${String(fire[i]).padStart(16)}${String(hits[i]).padStart(10)}${String(m).padStart(14)}`);
  }
  // 全场统计
  let tf = 0, tm = 0;
  for (let i = 0; i < minLen; i++) { tf += fire[i]; tm += fire[i] - hits[i]; }
  console.log(`\n  全场: 开火${tf}发, 命中${totalHits}发, 未命中${tm}发`);
  console.log(`  反推命中率 = ${totalHits}/${tf} = ${(totalHits / tf * 100).toFixed(2)}%`);

  // 残差的自相关
  const fullMiss: number[] = [];
  for (let i = 0; i < minLen; i++) fullMiss.push(fire[i] - hits[i]);
  console.log(`\n  未命中序列的自相关:`);
  for (let lag = 1; lag <= 6; lag++) {
    const a = acf(fullMiss, lag);
    console.log(`    lag${lag}: ${a.toFixed(3)} ${Math.abs(a) < 0.15 ? '← 近独立' : ''}`);
  }

  // 关键判据
  const lag1 = acf(fullMiss, 1);
  console.log(`\n  ★ 判读:`);
  console.log(`    未命中序列lag1 = ${lag1.toFixed(3)}`);
  if (Math.abs(lag1) < 0.15) {
    console.log(`    → |lag1|<0.15，未命中近似时间独立`);
    console.log(`    → 支持"每发独立判定命中"（固定种子下→序列确定但相邻独立）`);
  } else {
    console.log(`    → |lag1|≥0.15，未命中有时间结构`);
    console.log(`    → 命中判定非独立，存在某种确定性调度`);
  }

  return { hits, fire, fullMiss, lag1 };
}

const buff = analyze('有加成 (+25%)', path.join(BASE, 'battle_report/enemy_battle_data_decoded.txt'));
const nobuff = analyze('无加成', path.join(BASE, 'battle_report_nobuff/enemy_battle_data_decoded.txt'));

// ===== 总结 =====
console.log('\n\n' + '='.repeat(70));
console.log('★ 综合判读');
console.log('='.repeat(70));
console.log(`
  方法：把实测命中数序列 = "全命中开火数(确定)" - "未命中数(机制信号)"
  把运动学结构(CD与采样干涉)剥离，剩下的"未命中序列"是纯命中判定信号。

  关键问题：未命中序列是否时间独立？
    独立 → 每发独立判定（固定种子roll能解释确定性复现）
    不独立 → 命中判定有时间相关结构（需更复杂机制）

  注意局限性：
  1. "同相位"开火模型是假设，两艘船真实相位未知（可能错位）
  2. 5秒采样会把同窗口的多发合并，损失发级分辨率
  3. 副炮残差(保底2/发)被当作噪声，可能有干扰
  → 这些都会在"同配置重跑数据"中被直接验证（见下）
`);
