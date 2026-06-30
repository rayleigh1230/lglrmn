/**
 * 系统排查: 14%额外减伤来自哪里?
 *
 * 已确认:
 *   目标船: HP52223 抵抗45 护盾3%, 无额外防御策略
 *   斗牛武器1: dph525 能量, 武器2: dph28 能量
 *   实测反推perHit系数f=0.834 (总减伤17%)
 *   护盾3%只能解释到f=0.97, 差14%
 *
 * 系统排查所有可能:
 *   A. 护盾机制理解错(不是简单百分比?)
 *   B. 能量武器也要破某种"护盾值"(数值型)?
 *   C. 我的发数计算错(导致反推f错)?
 *   D. 触发时刻"20s"是目测, 实际不同?
 *   E. 多艘集火时伤害有递减?
 *   F. 武器命中区间不是均匀分布?
 */
const HP = 52223;
const TARGET = { hp: 52223, resistance: 45, shield: 0.03 };

console.log('='.repeat(80));
console.log('排查A/B: 护盾机制');
console.log('='.repeat(80));
console.log('假设1: 护盾3% = 能量减伤3% → perHit=dph×0.97');
console.log('  武器1: 525×0.97 = 509.25');
console.log('  实测反推perHit1 = 525×0.834 = 437.8');
console.log('  差距: 509.25 vs 437.8, 多减伤14%');
console.log('');
console.log('假设2: 抵抗45对能量也生效?');
console.log('  武器1: 525−45 = 480, f=480/525=0.914 → 仍不够(实测0.834)');
console.log('  武器2: 28−45 = -17 → 负数! 不可能(小伤害武器直接免疫?)');
console.log('  → 抵抗对能量生效会导致武器2打不动, 但实测有伤害, 排除');

console.log('\n' + '='.repeat(80));
console.log('排查C: 发数计算是否正确?');
console.log('='.repeat(80));
console.log('武器1: 锁4 + 每2.7s一发. 在20s内每艘: floor((20-4)/2.7)+1 = ?');
for (const w of [[20, 4, 2.7], [30, 4, 2.7], [40, 4, 2.7]] as [number, number, number][]) {
  const [win, lock, cd] = w;
  const n = Math.floor((win - lock) / cd + 1 + 1e-6);
  console.log(`  窗口${win}s, 锁${lock}, 冷却${cd}: 每艘${n}发`);
}

console.log('\n' + '='.repeat(80));
console.log('排查D: 触发时刻不是20s, 反推f会变');
console.log('='.repeat(80));
// 如果触发时刻不是20s, 前段时长不同, 反推的perHit也不同
// 重新: 用【两档总时长差】反推, 这个不依赖触发时刻!
// 跨度判据已证明加法. 用加法模型, 已知两档总时长, 反推perHit系数
console.log('更可靠的方法: 不用触发时刻, 用【完整战斗】反推');
console.log('加法模型下, 整场伤害 = 发数 × 命中率 × perHit = HP');
console.log('perHit = HP / (总发数 × 加权命中率)');
console.log('');

// 计算两档的总发数(到击杀为止)和加权命中率
function totalShots(T: number, nShips: number) {
  // 武器1: 锁4, 每2.7s, 1门/艘
  const s1 = Math.floor((T - 4) / 2.7 + 1 + 1e-6) * 1 * nShips;
  // 武器2: 锁3, 每2.1s, 3门/艘
  const s2 = Math.floor((T - 3) / 2.1 + 1 + 1e-6) * 3 * nShips;
  return { s1: Math.max(0, s1), s2: Math.max(0, s2) };
}

console.log('用实测总时长反推perHit(加法模型):');
console.log('档位 | 实测T | 武器1发数 | 武器2发数 | 反推f');
console.log('-'.repeat(70));
for (const [k, T] of [[0, 74.5], [0.30, 52]] as [number, number][]) {
  const { s1, s2 } = totalShots(T, 10);
  // 加权命中率(整场平均, 加法模型, 含buff窗)
  // 简化: 用前段(20%闪避)和后段(60%闪避)的时间加权
  // 前段时长 ≈ 触发时刻, 后段 = T - 前段
  // 但触发时刻未知, 用迭代或假设
  // 更简单: 整场平均闪避 ≈ 加权
  // 先假设触发在 T×0.27 (20/74.5), 应用到两档
  const trigFrac = 0.27;
  const tFront = T * trigFrac;
  const tBack = T * (1 - trigFrac);
  // 平均命中率(加法)
  // 武器1: 前段0.85×0.80, 后段0.85×0.40
  const h1avg = 0.85 * (trigFrac * 0.80 + (1 - trigFrac) * 0.40);
  const h2avg = 0.60 * (trigFrac * 0.80 + (1 - trigFrac) * 0.40);
  // HP = s1×h1avg×525×f + s2×h2avg×28×f
  // f = HP / (s1×h1avg×525 + s2×h2avg×28)
  const denom = s1 * h1avg * 525 + s2 * h2avg * 28;
  const f = HP / denom;
  console.log(`+${(k*100).toFixed(0)}% | ${T}s | ${s1} | ${s2} | ${f.toFixed(3)}`);
}

console.log('\n' + '='.repeat(80));
console.log('排查E: 护盾是否有【数值】部分?');
console.log('='.repeat(80));
console.log('如果护盾是"先吸收X点再百分比减伤":');
console.log('  护盾3%可能指【最大护盾值】=3%×HP = 1567');
console.log('  武器1每发525, 先扣护盾1567 → 前3发被护盾吸收, 之后全额');
console.log('  这会降低前期DPS, 但不影响稳态');
console.log('  → 可能解释前段偏长, 但不解释整体f=0.834');

console.log('\n' + '='.repeat(80));
console.log('排查F: 最可能 — 命中区间不是均匀分布');
console.log('='.repeat(80));
console.log('我一直假设区间50-70%是均匀分布(中值0.60)');
console.log('但游戏可能用Beta分布或偏向上沿!');
console.log('如果实际平均命中 > 中值, 反推的f会偏低');
console.log('');
// 反推: 如果f=0.97(护盾3%正确), 那命中率被低估了多少?
// HP = shots × hit × dph × 0.97
// 实测hit_implied = HP / (shots × dph × 0.97)
// 与中值命中比较
for (const [k, T] of [[0, 74.5], [0.30, 52]] as [number, number][]) {
  const { s1, s2 } = totalShots(T, 10);
  const trigFrac = 0.27;
  const denom = s1 * 525 * 0.97 + s2 * 28 * 0.97;
  const hitImplied = HP / denom; // 整场加权命中率(假设f=0.97)
  // 中值预测的加权命中率
  const h1mid = 0.85, h2mid = 0.60;
  const denomMid = s1 * h1mid + s2 * h2mid;
  const hImplied_weighted = HP / denom;
  console.log(`+${(k*100).toFixed(0)}%: 若f=0.97, 反推整场加权命中率 = ${hitImplied.toFixed(3)}`);
}
