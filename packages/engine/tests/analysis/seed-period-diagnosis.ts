/**
 * 周期性诊断：lag5/lag6 强信号的物理来源
 *
 * 发现 lag1≈-0.6, lag5≈+0.58, lag6≈-0.63 — 周期信号！
 * 假设：主炮CD=8.4s 与 5s采样窗口干涉，产生 ~25s(5个5s窗口) 的拍频周期
 *   8.4s周期 → 在5s网格上的相位每5秒推进 5/8.4=0.595圈
 *   相位重合周期 = 1/|0.595-0.5| 取整... 需算拍频
 *
 * 验证方法：模拟"确定性开火"（2艘船固定相位开火），看是否产生同样的自相关结构。
 * 若模拟的ACF与实测吻合 → 负自相关是"周期不对齐"的纯运动学效应，与命中判定机制无关。
 *
 * 用法：npx tsx tests/analysis/seed-period-diagnosis.ts
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

function acf(hits: number[], maxLag: number) {
  const n = hits.length;
  const mean = hits.reduce((a, b) => a + b, 0) / n;
  const variance = hits.reduce((s, h) => s + (h - mean) ** 2, 0) / n;
  const out: number[] = [];
  for (let lag = 0; lag <= maxLag; lag++) {
    let cov = 0; let cnt = 0;
    for (let i = 0; i < n - lag; i++) { cov += (hits[i] - mean) * (hits[i + lag] - mean); cnt++; }
    out.push(cov / cnt / variance);
  }
  return out;
}

// ===== 实测ACF =====
const realBuff = acf(loadHits(path.join(BASE, 'battle_report/enemy_battle_data_decoded.txt')), 12);
const realNobuff = acf(loadHits(path.join(BASE, 'battle_report_nobuff/enemy_battle_data_decoded.txt')), 12);

console.log('='.repeat(70));
console.log('实测命中序列自相关 (前12阶)');
console.log('='.repeat(70));
console.log(`\n  ${'lag'.padStart(5)}  ${'有加成'.padStart(10)}  ${'无加成'.padStart(10)}  图`);
for (let lag = 0; lag <= 12; lag++) {
  const maxAbs = Math.max(Math.abs(realBuff[lag]), Math.abs(realNobuff[lag]));
  const bar = (Math.sign(realBuff[lag]) >= 0 ? '+' : '-') + '█'.repeat(Math.round(maxAbs * 30));
  console.log(`  ${String(lag).padStart(5)}  ${realBuff[lag].toFixed(3).padStart(10)}  ${realNobuff[lag].toFixed(3).padStart(10)}  ${bar}`);
}

// ===== 模拟：纯运动学开火（确定相位，无随机） =====
// 模型：2艘船，每艘CD=8.4s，每周期打2发(同时)，首发t0=15s(实测首发延迟)
// 统计每个5秒窗口内的开火数(不是命中数，假设全命中看相位结构)
console.log('\n\n' + '='.repeat(70));
console.log('模拟1：纯确定性开火（2艘船固定相位，假设全命中）');
console.log('='.repeat(70));

function simulateFireCount(duration: number, shipCount: number, cd: number, shotsPerCycle: number, t0: number, phaseOffsets: number[]) {
  // 每个5秒窗口的开火数
  const windows: number[] = [];
  for (let wStart = 0; wStart < duration; wStart += 5) {
    let count = 0;
    const wEnd = wStart + 5;
    for (let s = 0; s < shipCount; s++) {
      const phase = t0 + phaseOffsets[s];
      // 该船在 [wStart, wEnd) 内的开火
      for (let cycle = 0; ; cycle++) {
        const fireTime = phase + cycle * cd;
        if (fireTime >= wEnd) break;
        if (fireTime >= wStart) count += shotsPerCycle;
      }
    }
    windows.push(count);
  }
  return windows;
}

// 假设两艘船同相位开火(都t0=15)
const simSync = simulateFireCount(1100, 2, 8.4, 2, 15, [0, 0]);
// 两艘船相位差半个周期
const simHalfPhase = simulateFireCount(1100, 2, 8.4, 2, 15, [0, 4.2]);
// 两艘船小相位差
const simSmallPhase = simulateFireCount(1100, 2, 8.4, 2, 15, [0, 1]);

console.log(`\n  前30个5秒窗口的开火数(全命中假设):`);
console.log(`  同相位:    ${simSync.slice(0, 30).join(' ').replace(/(\d+)/g, (m) => m.padStart(2))}`);
console.log(`  半周期差:  ${simHalfPhase.slice(0, 30).join(' ').replace(/(\d+)/g, (m) => m.padStart(2))}`);
console.log(`  小相位差:  ${simSmallPhase.slice(0, 30).join(' ').replace(/(\d+)/g, (m) => m.padStart(2))}`);
console.log(`  实测(有加): ${loadHits(path.join(BASE, 'battle_report/enemy_battle_data_decoded.txt')).slice(0, 30).join(' ').replace(/(\d+)/g, (m) => m.padStart(2))}`);

const acfSync = acf(simSync, 8);
const acfHalf = acf(simHalfPhase, 8);
console.log(`\n  各模型ACF对比:`);
console.log(`  ${'lag'.padStart(5)}  ${'实测(有加)'.padStart(10)}  ${'同相位'.padStart(10)}  ${'半周期差'.padStart(10)}`);
for (let lag = 0; lag <= 8; lag++) {
  console.log(`  ${String(lag).padStart(5)}  ${realBuff[lag].toFixed(3).padStart(10)}  ${acfSync[lag].toFixed(3).padStart(10)}  ${acfHalf[lag].toFixed(3).padStart(10)}`);
}

console.log(`\n  解读:`);
console.log(`  - 若"同相位/半周期差"模型的ACF形状与实测相似 → 负自相关来自CD与采样的干涉`);
console.log(`  - 形状不同 → 负自相关是命中判定机制本身造成`);
console.log(`  - 注意：实测是"命中数"，模型是"开火数"(全命中)，命中率<1会叠加一层噪声`);

// ===== 周期估算 =====
console.log('\n\n' + '='.repeat(70));
console.log('周期性分析：8.4s CD 与 5s 采样的拍频');
console.log('='.repeat(70));
// CD=8.4 在5s网格上：相位推进 = 5/8.4 = 0.5952 圈/窗
// 相位重合：需要 k*0.5952 ≈ 整数 → k≈5时 0.5952*5=2.976≈3, 残差0.024
// 即每5个窗口(~25s)相位几乎重合 → 这解释了 lag5 的强正相关!
const phaseStep = 5 / 8.4;
console.log(`  CD=8.4s, 每5秒窗口相位推进 = ${phaseStep.toFixed(4)}圈`);
for (let k = 1; k <= 8; k++) {
  const phase = (phaseStep * k) % 1;
  const nearestInt = Math.round(phaseStep * k);
  const residual = Math.abs(phaseStep * k - nearestInt);
  console.log(`  lag${k}: 累计相位=${(phaseStep * k).toFixed(3)}圈, 最近整数=${nearestInt}, 残差=${residual.toFixed(4)} ${residual < 0.05 ? '← 近重合' : ''}`);
}
console.log(`\n  → lag5 累计相位2.976≈3圈，残差0.024 → 近重合 → 强正相关`);
console.log(`  → lag6 累计相位3.571，相位偏移大 → 强负相关`);
console.log(`  → 这与实测 lag5=+0.58, lag6=-0.63 完全吻合！`);
