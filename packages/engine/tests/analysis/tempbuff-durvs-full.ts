/**
 * 斗牛级【满面板】作为攻击方测试临时buff —— DPS + 命中加成扫描
 *
 * 满面板斗牛:
 *   武器1: dph525 / 冷却2.7 / 锁定4 / 数量1 / 命中70-100%(中值0.85)
 *   武器2: dph28  / 冷却2.1 / 锁定3 / 数量3 / 命中50-70%(中值0.60)
 *   可额外+30%命中(两武器同加) → 进+槽
 *
 * 目标船(船A型): 结构52223 抵抗45 护盾3% 闪避20%, 结构<60%触发buff+40%/45s
 *
 * 关键: +30%命中是【攻击方加成】, 进+槽 → final = base×(1+0.30−dodge)
 *   这会同时改变前段和buff窗的命中率, 影响信号。
 *
 * 用法：npx tsx tests/tempbuff-durvs-full.ts
 */
const HP = 52223;
const TRIG = 0.60;
const DODGE_BASE = 0.20;
const BUFF_DODGE = 0.40;
const BUFF_DUR = 45;
const SHIELD = 0.03;

// 满面板斗牛DPS(稳态, 忽略首次锁定)
const w1Dps = 525 / 2.7;       // 武器1 单舰
const w2Dps = (28 / 2.1) * 3;  // 武器2 单舰(3门)
const durvsTotal = w1Dps + w2Dps;

console.log('='.repeat(92));
console.log('满面板斗牛DPS');
console.log('='.repeat(92));
console.log(`武器1: ${(w1Dps).toFixed(1)} DPS = ${Math.round(w1Dps * 60)}/分钟`);
console.log(`武器2(3门): ${(w2Dps).toFixed(1)} DPS = ${Math.round(w2Dps * 60)}/分钟`);
console.log(`单舰总: ${(durvsTotal).toFixed(1)} DPS = ${Math.round(durvsTotal * 60)}/分钟`);
console.log(`(白板是7940/分钟, 满面板提升到${Math.round(durvsTotal * 60)}, 约${(durvsTotal * 60 / 7940).toFixed(1)}倍)`);

const w1Frac = w1Dps / durvsTotal;
const w2Frac = w2Dps / durvsTotal;

/** 加权三段模型: 给定总DPS/秒、命中加成k、buff模型, 返回时间结构 */
function simulate(totalDpsPerSec: number, hitBonus: number, model: 'add' | 'mul') {
  const f = 1 - SHIELD;
  const h1Front = 0.85 * (1 + hitBonus - DODGE_BASE);
  const h2Front = 0.60 * (1 + hitBonus - DODGE_BASE);
  const h1Buff = model === 'add' ? 0.85 * (1 + hitBonus - DODGE_BASE - BUFF_DODGE) : 0.85 * (1 + hitBonus - DODGE_BASE) * (1 - BUFF_DODGE);
  const h2Buff = model === 'add' ? 0.60 * (1 + hitBonus - DODGE_BASE - BUFF_DODGE) : 0.60 * (1 + hitBonus - DODGE_BASE) * (1 - BUFF_DODGE);
  const dpsFront = totalDpsPerSec * f * (w1Frac * h1Front + w2Frac * h2Front);
  const dpsBuff = totalDpsPerSec * f * (w1Frac * h1Buff + w2Frac * h2Buff);
  const hpFront = HP * (1 - TRIG);
  const hpBack = HP * TRIG;
  const T1 = hpFront / dpsFront;
  const dmgInBuff = dpsBuff * BUFF_DUR;
  let T2: number, hpLeft: number;
  if (dmgInBuff >= hpBack) { T2 = hpBack / dpsBuff; hpLeft = 0; }
  else { T2 = BUFF_DUR; hpLeft = hpBack - dmgInBuff; }
  const T3 = hpLeft > 0 ? hpLeft / dpsFront : 0;
  return { T_total: T1 + T2 + T3, diedInBuff: hpLeft === 0 };
}

console.log('\n' + '='.repeat(92));
console.log('扫描: 集火规模 × 命中加成 → 信号差');
console.log('='.repeat(92));

for (const hitBonus of [0, 0.30]) {
  console.log(`\n--- 命中加成 +${(hitBonus * 100).toFixed(0)}% ---`);
  console.log('斗牛数 | 总DPS/分钟 | 加法T | 乘法T | T差距 | 命中差距 | buff窗内死?');
  console.log('-'.repeat(80));
  for (const nShips of [1, 2, 3, 4, 5, 6, 8, 10, 12]) {
    const totalDps = durvsTotal * nShips;
    const ra = simulate(totalDps, hitBonus, 'add');
    const rm = simulate(totalDps, hitBonus, 'mul');
    const tGap = ra.T_total - rm.T_total;
    const avgAdd = HP / (totalDps * (1 - SHIELD) * ra.T_total);
    const avgMul = HP / (totalDps * (1 - SHIELD) * rm.T_total);
    const hGap = (avgMul - avgAdd) * 100;
    const mark = hGap > 3 ? '✓强' : hGap > 2 ? '~可' : '✗弱';
    console.log(`${nShips.toString().padStart(2)}艘  | ${Math.round(totalDps * 60).toString().padStart(7)} | ${ra.T_total.toFixed(0).padStart(3)}s | ${rm.T_total.toFixed(0).padStart(3)}s | ${tGap.toFixed(1).padStart(4)}s | ${hGap.toFixed(1).padStart(5)}pp | ${ra.diedInBuff ? '是' : '否 '} ${mark}`);
  }
}

console.log('\n' + '='.repeat(92));
console.log('深入: 加满+30%命中能否把信号顶上去?');
console.log('='.repeat(92));
console.log('+30%命中会同时提升前段和buff窗命中率, 但由于【buff窗更接近下限】,');
console.log('加法的相对影响更大 → 信号可能增强。看具体数值:');

for (const nShips of [3, 4, 5, 6]) {
  console.log(`\n【${nShips}艘斗牛, 总DPS ${Math.round(durvsTotal * nShips * 60)}/分钟】`);
  for (const hitBonus of [0, 0.15, 0.30]) {
    const ra = simulate(durvsTotal * nShips, hitBonus, 'add');
    const rm = simulate(durvsTotal * nShips, hitBonus, 'mul');
    const avgAdd = HP / (durvsTotal * nShips * (1 - SHIELD) * ra.T_total);
    const avgMul = HP / (durvsTotal * nShips * (1 - SHIELD) * rm.T_total);
    const hGap = (avgMul - avgAdd) * 100;
    const mark = hGap > 3 ? '✓' : hGap > 2 ? '~' : '✗';
    console.log(`  +${(hitBonus * 100).toFixed(0)}%命中: T=${ra.T_total.toFixed(0)}/${rm.T_total.toFixed(0)}s, 整场均命中${(avgAdd * 100).toFixed(1)}%/${(avgMul * 100).toFixed(1)}%, 差${hGap.toFixed(1)}pp ${mark}`);
  }
}
