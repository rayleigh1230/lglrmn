/**
 * 反向验证：把今天"base≈中值"的发现套回昨晚10斗牛场景，看误差多大。
 *
 * 逻辑：昨晚§3.2的4锚点（无策略/有策略 × +0%/+30%）原本用"下限base"精确吻合。
 *      今天康纳马拉轨道炮4场反推base≈0.616（中值附近），推翻了"下限base"。
 *      那么——如果斗牛base也用中值而非下限，4锚点会偏多少？
 *
 * 关键问题：斗牛武器的命中区间是什么？
 *   昨晚脚本用的是 mid_m=0.85, mid_s=0.60（中值），但没有明确记录下限。
 *   需要做区间扫描：看不同base假设下4锚点的总误差，判断哪个base最吻合。
 *
 * 【斗牛参数】（来自 calibrate-expected-damage.ts）
 *   10艘，主武器1门(dph525/护盾3%/cd2.7/lock4)，副武器3门(dph28/护盾3%/cd2.1/lock3)
 *   perHit主=509.25, perHit副=27.16
 *   靶：HP52223, 闪避20%, 有策略靶+60%血触发+40%闪避/45s
 *   锚点：无策略+0%=50s, 无策略+30%=42s, 有策略+0%=75s, 有策略+30%=52s
 *
 * 【本脚本】
 *   1. 用固定加法公式 base×(1+k−dodge)，扫描"主/副base"在不同取值下的4锚点误差
 *   2. 重点对比：下限base vs 中值base vs 今天反推的0.616比例
 *
 * 用法：npx tsx tests/analysis/backtest-bull-base.ts
 */

// ====== 斗牛确定参数 ======
const HP = 52223;
const DODGE_BASE = 0.20;
const BUFF_DODGE = 0.40;
const BUFF_DUR = 45;
const TRIG_FRAC = 0.60;
const N_SHIPS = 10;

const perHit_m = 525 * (1 - 0.03); // 509.25
const perHit_s = 28 * (1 - 0.03);  // 27.16
const cd_m = 2.7, lock_m = 4, cnt_m = 1;
const cd_s = 2.1, lock_s = 3, cnt_s = 3;

// ====== 期望伤害DES模拟（与 calibrate-expected-damage.ts 完全一致）======
function simulate(baseM: number, baseS: number, k: number, dodge: number, hasBuff: boolean): number {
  let hp = HP;
  let buffActive = false;
  let buffEnd = Infinity;
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
    while (ei < events.length && events[ei].t <= now + 1e-9) {
      const e = events[ei];
      const wi = e.wi;
      const base = wi === 0 ? baseM : baseS;
      const perHit = wi === 0 ? perHit_m : perHit_s;
      const cd = wi === 0 ? cd_m : cd_s;
      const curDodge = hasBuff && buffActive ? dodge + BUFF_DODGE : dodge;
      const hr = Math.min(0.95, Math.max(0.10, base * (1 + k - curDodge)));
      hp -= perHit * hr;
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

// ====== 锚点 ======
const anchors = [
  { label: '无策略+0%',  k: 0,    dodge: DODGE_BASE, hasBuff: false, T: 50 },
  { label: '无策略+30%', k: 0.30, dodge: DODGE_BASE, hasBuff: false, T: 42 },
  { label: '有策略+0%',  k: 0,    dodge: DODGE_BASE, hasBuff: true,  T: 75 },
  { label: '有策略+30%', k: 0.30, dodge: DODGE_BASE, hasBuff: true,  T: 52 },
];

function evalConfig(baseM: number, baseS: number, name: string): void {
  console.log('-'.repeat(78));
  console.log(`配置: ${name}  (主base=${baseM}, 副base=${baseS})`);
  console.log('-'.repeat(78));
  let totalErr = 0;
  for (const a of anchors) {
    const T = simulate(baseM, baseS, a.k, a.dodge, a.hasBuff);
    const err = T - a.T;
    totalErr += Math.abs(err);
    const flag = Math.abs(err) < 3 ? '✓' : Math.abs(err) < 8 ? '≈' : '✗';
    console.log(`  ${a.label.padEnd(10)}: 实测${String(a.T).padStart(2)}s | 模拟${T.toFixed(1).padStart(5)}s | 误差${(err>=0?'+':'')}${err.toFixed(1).padStart(5)}s ${flag}`);
  }
  console.log(`  平均绝对误差: ${(totalErr / 4).toFixed(1)}s\n`);
}

console.log('='.repeat(78));
console.log('反向验证：不同base假设下，10斗牛4锚点的误差对比');
console.log('='.repeat(78));
console.log(`靶: HP${HP}, 闪避${DODGE_BASE*100}%, 武器主${perHit_m.toFixed(1)}/副${perHit_s.toFixed(1)}\n`);

// 配置1: 昨晚"下限"结论（主0.70/副0.50）—— 但需注意：昨晚脚本实际用的是中值0.85/0.60
// 这里我们不知道斗牛的真实区间，先测几个关键假设

evalConfig(0.70, 0.50, '假设A: 下限base（主0.70/副0.50，§1.4原结论）');
evalConfig(0.85, 0.60, '假设B: 中值base（主0.85/副0.60，昨晚脚本实际用的）');
evalConfig(0.775, 0.55, '假设C: 1/4位（主0.775/副0.55）');

// 配置4: 今天反推的比例 —— 如果斗牛base也遵循"2/3位"规律
// 今天轨道炮：区间50-70%，反推0.616，比值0.616/区间= 0.616相对位置
// 50-70区间内，0.616的位置 = (0.616-0.5)/(0.7-0.5) = 0.58 → 偏向中值偏下
// 套用到斗牛（假设主区间70-100%、副40-60%未知，这里用脚本的0.85中值反推）
// 用比例法：今天的相对位置0.58 → 斗牛主0.775/副0.55约等于1/4位
console.log('='.repeat(78));
console.log('【关键问题：斗牛的真实命中区间下限未知】');
console.log('='.repeat(78));
console.log('昨晚脚本 mid_m=0.85, mid_s=0.60 是【中值】，但斗牛区间下限从未记录。');
console.log('若斗牛区间 = 主0.70-1.00 / 副0.40-0.80（假设），则中值=主0.85/副0.60。');
console.log('今天轨道炮反推base落在区间50-70%的中值偏下位置(0.616≈2/3位)。');
console.log('→ 若斗牛遵循同一规律，斗牛base应在 主0.85/副0.60 附近（即昨晚脚本实际用的值）。');
console.log('→ 昨晚"下限0.70/0.50"可能是误读，实际生效的就是中值。');

// ====== 核心判据：扫描主base，找最佳 ======
console.log('\n' + '='.repeat(78));
console.log('【扫描：固定副base=0.60，扫描主base找最小总误差】');
console.log('='.repeat(78));
console.log(' 主base  | 无+0% | 无+30% | 有+0% | 有+30% | 平均误差');
console.log(' ' + '-'.repeat(74));
let bestBase = 0.7, bestErr = Infinity;
for (let bm = 0.65; bm <= 0.95 + 1e-9; bm += 0.025) {
  const ts = anchors.map(a => simulate(bm, 0.60, a.k, a.dodge, a.hasBuff));
  const errs = ts.map((t, i) => Math.abs(t - anchors[i].T));
  const avg = errs.reduce((a, b) => a + b, 0) / 4;
  if (avg < bestErr) { bestErr = avg; bestBase = bm; }
  const cells = ts.map((t, i) => `${t.toFixed(0)}(${(t-anchors[i].T>=0?'+':'')}${(t-anchors[i].T).toFixed(0)})`);
  console.log(`  ${bm.toFixed(3)} | ${cells[0].padStart(7)} | ${cells[1].padStart(7)} | ${cells[2].padStart(6)} | ${cells[3].padStart(6)} | ${avg.toFixed(1)}s${avg < 4 ? '  ★' : ''}`);
}
console.log(`\n最佳主base = ${bestBase.toFixed(3)}（平均误差${bestErr.toFixed(1)}s）`);

// ====== 但注意：+30%档有衰减问题 ======
console.log('\n' + '='.repeat(78));
console.log('【⚠️ 重要：+30%档有独立的衰减问题，不能只用+0%档定base】');
console.log('='.repeat(78));
console.log('昨天§2已证：+30%加成在多舰下只兑现58%（比值0.822 vs 加法预测0.727）。');
console.log('所以用含+30%的锚点反推base会引入"加成衰减"的污染。');
console.log('→ 干净的反推应该只看+0%档（无加成，无衰减）。');
console.log('');
console.log('只看+0%档（无策略+有策略），主base扫描：');
console.log(' 主base  | 无策略+0%(实测50s) | 有策略+0%(实测75s) | 两点误差和');
console.log(' ' + '-'.repeat(70));
let bestBase0 = 0.7, bestErr0 = Infinity;
for (let bm = 0.65; bm <= 0.95 + 1e-9; bm += 0.025) {
  const t1 = simulate(bm, 0.60, 0, DODGE_BASE, false);
  const t2 = simulate(bm, 0.60, 0, DODGE_BASE, true);
  const e1 = Math.abs(t1 - 50);
  const e2 = Math.abs(t2 - 75);
  const sum = e1 + e2;
  if (sum < bestErr0) { bestErr0 = sum; bestBase0 = bm; }
  console.log(`  ${bm.toFixed(3)} |   ${t1.toFixed(1)}s (误差${(t1-50>=0?'+':'')}${(t1-50).toFixed(1)})   |   ${t2.toFixed(1)}s (误差${(t2-75>=0?'+':'')}${(t2-75).toFixed(1)})    | ${sum.toFixed(1)}s${sum < 5 ? '  ★' : ''}`);
}
console.log(`\n最佳主base(+0%档) = ${bestBase0.toFixed(3)}（两点误差和${bestErr0.toFixed(1)}s）`);
console.log('\n解读：如果最佳base落在0.85附近（中值），说明斗牛base=中值，昨晚"下限"是误读。');
console.log('     如果最佳base落在0.70附近（下限），说明斗牛和轨道炮base取值规则确实不同。');
