/**
 * 路径A校准脚本 —— 期望伤害模式, 用4个实测锚点反推正确命中率
 *
 * 核心假设(已由实测锁定):
 *   - 伤害计算 = 期望伤害(每发扣 perHit × finalHitRate, 无RNG)
 *   - 单靶场景无目标选择 → 完全确定
 *   - 随机源(跨排转火)不影响单靶锚点
 *
 * 4个锚点(全部单靶, 用户实测):
 *   无策略靶(HP52223, 闪避20%):
 *     +0%命中 → 50s
 *     +30%命中 → 42s
 *   有策略靶(HP52223, 闪避20% + 60%血触发+40%闪避/45s):
 *     +0%命中 → 75s
 *     +30%命中 → 52s
 *
 * 目标: 找到能让引擎总时长落在4个锚点的命中率公式
 *
 * 用法：npx tsx tests/analysis/calibrate-expected-damage.ts
 */

// ====== 确定参数(面板/游戏机制) ======
const HP = 52223;
const SHIELD = 0.03;
const DODGE_BASE = 0.20;
const BUFF_DODGE = 0.40;
const BUFF_DUR = 45;
const TRIG_FRAC = 0.60;
const N_SHIPS = 10;

// 武器(斗牛满面板): 主525/副28, 能量武器(吃护盾, 不吃抵抗)
const perHit_m = 525 * (1 - SHIELD); // 509.25
const perHit_s = 28 * (1 - SHIELD);  // 27.16
const cd_m = 2.7, lock_m = 4, cnt_m = 1;
const cd_s = 2.1, lock_s = 3, cnt_s = 3;

// 区间中值: 主0.85, 副0.60
const mid_m = 0.85, mid_s = 0.60;

// ====== 期望伤害DES模拟 ======
// 每发扣 perHit × finalHitRate(连续分数伤害), 无RNG
// finalHitRate 公式可切换, 用于校准
type HitModel = (base: number, k: number, dodge: number) => number;

function simulate(k: number, dodge: number, hasBuff: boolean, hitFn: HitModel): number {
  let hp = HP;
  let buffActive = false;
  let buffEnd = Infinity;
  // 事件驱动: 每艘每武器每门的首发(含锁定)
  type Evt = { t: number; s: number; wi: number; ci: number };
  const events: Evt[] = [];
  for (let s = 0; s < N_SHIPS; s++) {
    for (let wi = 0; wi < 2; wi++) {
      const lock = wi === 0 ? lock_m : lock_s;
      const cnt = wi === 0 ? cnt_m : cnt_s;
      for (let ci = 0; ci < cnt; ci++) events.push({ t: lock, s, wi, ci });
    }
  }
  events.sort((a, b) => a.t - b.t);

  let ei = 0;
  let now = 0;
  let guard = 0;
  while (hp > 0 && guard++ < 500000) {
    if (ei >= events.length) break;
    now = events[ei].t;
    if (buffActive && now >= buffEnd) buffActive = false;
    // 处理同刻事件
    while (ei < events.length && events[ei].t <= now + 1e-9) {
      const e = events[ei];
      const wi = e.wi;
      const base = wi === 0 ? mid_m : mid_s;
      const perHit = wi === 0 ? perHit_m : perHit_s;
      const cd = wi === 0 ? cd_m : cd_s;
      const curDodge = hasBuff && buffActive ? dodge + BUFF_DODGE : dodge;
      const hr = hitFn(base, k, curDodge);
      // 期望伤害: 每发扣 perHit × hr
      hp -= perHit * hr;
      // 触发检查(有策略靶)
      if (hasBuff && !buffActive && hp <= HP * TRIG_FRAC) {
        buffActive = true;
        buffEnd = now + BUFF_DUR;
      }
      events.push({ t: now + cd, s: e.s, wi: e.wi, ci: e.ci });
      ei++;
    }
    events.sort((a, b) => a.t - b.t);
  }
  return now;
}

// ====== 候选命中率公式 ======
const models: { name: string; fn: HitModel }[] = [
  {
    name: 'A: base×(1+k−dodge) [现有加法]',
    fn: (b, k, d) => Math.min(0.95, Math.max(0.10, b * (1 + k - d))),
  },
  {
    name: 'B: base×(1+k)×(1−dodge) [乘法闪避]',
    fn: (b, k, d) => Math.min(0.95, Math.max(0.10, b * (1 + k) * (1 - d))),
  },
  {
    name: 'C: base×(1+k−dodge)×C [加法+全局系数]',
    fn: (b, k, d) => Math.min(0.95, Math.max(0.10, b * (1 + k - d) * 0.75)),
  },
];

// ====== 锚点 ======
const anchors = [
  { label: '无策略+0%',  k: 0,    dodge: DODGE_BASE, hasBuff: false, T: 50 },
  { label: '无策略+30%', k: 0.30, dodge: DODGE_BASE, hasBuff: false, T: 42 },
  { label: '有策略+0%',  k: 0,    dodge: DODGE_BASE, hasBuff: true,  T: 75 },
  { label: '有策略+30%', k: 0.30, dodge: DODGE_BASE, hasBuff: true,  T: 52 },
];

console.log('='.repeat(85));
console.log('路径A: 期望伤害模式 — 4锚点校准');
console.log('='.repeat(85));
console.log(`武器: 主${perHit_m.toFixed(1)}/副${perHit_s.toFixed(1)} (面板×护盾)`);
console.log(`靶: HP${HP} 闪避${DODGE_BASE * 100}% ${BUFF_DODGE * 100 > 0 ? `+buff${BUFF_DODGE * 100}%/45s@60%` : ''}`);
console.log('');

for (const m of models) {
  console.log('-'.repeat(85));
  console.log(`公式 ${m.name}`);
  console.log('-'.repeat(85));
  let totalErr = 0;
  for (const a of anchors) {
    const T = simulate(a.k, a.dodge, a.hasBuff, m.fn);
    const err = T - a.T;
    totalErr += Math.abs(err);
    const flag = Math.abs(err) < 3 ? '✓' : Math.abs(err) < 8 ? '≈' : '✗';
    console.log(`  ${a.label}: 实测${a.T}s | 模拟${T.toFixed(1)}s | 误差${err > 0 ? '+' : ''}${err.toFixed(1)}s ${flag}`);
  }
  console.log(`  平均绝对误差: ${(totalErr / 4).toFixed(1)}s`);
  console.log('');
}

// ====== 扫描: 无策略靶两档反推真实命中率 ======
console.log('='.repeat(85));
console.log('反推: 无策略靶两档的真实【整场有效命中率】(不依赖公式形式)');
console.log('='.repeat(85));
const TDPS = N_SHIPS * (cnt_m / cd_m * perHit_m + cnt_s / cd_s * perHit_s);
console.log(`理论DPS(100%命中): ${TDPS.toFixed(1)}/s`);
for (const a of [anchors[0], anchors[1]]) {
  const eff = HP / (TDPS * a.T);
  console.log(`  ${a.label}: ${HP}/(${TDPS.toFixed(0)}×${a.T}) = ${(eff * 100).toFixed(1)}%`);
}
console.log('');
console.log('加法公式在无策略靶(纯20%闪避)两档的预测:');
for (const k of [0, 0.30]) {
  const h = mid_m * (1 + k - DODGE_BASE) * (cnt_m / cd_m * perHit_m) / (cnt_m / cd_m * perHit_m + cnt_s / cd_s * perHit_s)
          + mid_s * (1 + k - DODGE_BASE) * (cnt_s / cd_s * perHit_s) / (cnt_m / cd_m * perHit_m + cnt_s / cd_s * perHit_s);
  console.log(`  +${k * 100}%: 加法预测命中率 = ${(h * 100).toFixed(1)}%`);
}
console.log('  (与上面反推值对比 → 看公式偏高还是偏低)');
