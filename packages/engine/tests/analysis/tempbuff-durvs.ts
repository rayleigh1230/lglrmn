/**
 * 斗牛级驱逐 作为【攻击方】测试临时buff的可行性
 *
 * 斗牛级(攻击方):
 *   武器1: dph455 / 持续0 / 弹药1次数1→1发 / 冷却4.2 / 锁定4 / 数量1 / 命中70-100%(中值0.85)
 *   武器2: dph24  / 持续0 / 弹药1次数1→1发 / 冷却3   / 锁定3 / 数量3 / 命中50-70%(中值0.60)
 *   抵抗36 结构42107 闪避8%
 *
 * 但这里是【攻击方】, 攻击方自己的抵抗/闪避/结构不影响输出, 只看武器DPS。
 *
 * 目标船(防御方, 船A型): 结构52223 抵抗45 护盾3% 闪避20%, 结构<60%触发buff+40%/45s
 *
 * 关键问题:
 *   1. 斗牛单舰DPS够不够? 不够的话要几艘集火?
 *   2. 信号差能到多少?
 *
 * 用法：npx tsx tests/tempbuff-durvs.ts
 */

// 斗牛武器DPS计算(每秒)
// 武器1: 每周期1发dph455, 周期=锁定4(仅首)+冷却4.2 → 稳态每4.2s一发 → DPS=455/4.2
// 武器2: 3门, 每门每周期1发dph24, 周期=冷却3 → 每门 24/3, 3门 → 72/3=24/s
function durvsDPS() {
  // 稳态DPS(忽略首次锁定的渐入, 长战斗近似)
  const w1 = 455 / 4.2;  // 单舰武器1
  const w2 = (24 / 3) * 3; // 单舰武器2(3门)
  return { w1, w2, total: w1 + w2 };
}

// 目标船参数
const HP = 52223;
const TRIG = 0.60;
const DODGE_BASE = 0.20;
const BUFF_DODGE = 0.40;
const BUFF_DUR = 45;
const SHIELD = 0.03; // 能量武器减伤3%

/** 三段模型: 给定攻击方DPS/秒(面板, 含数量)、命中中值、buff模型, 返回时间结构 */
function simulate(totalDpsPerSec: number, baseMid: number, model: 'add' | 'mul') {
  const f = 1 - SHIELD; // 能量武器防御系数
  const hitFront = baseMid * (1 - DODGE_BASE);
  const hitBuff = model === 'add'
    ? baseMid * (1 - DODGE_BASE - BUFF_DODGE)
    : baseMid * (1 - DODGE_BASE) * (1 - BUFF_DODGE);

  const hpFront = HP * (1 - TRIG);
  const hpBack = HP * TRIG;

  const dpsFront = totalDpsPerSec * f * hitFront;
  const dpsBuff = totalDpsPerSec * f * hitBuff;

  const T1 = hpFront / dpsFront;
  const dmgInBuff = dpsBuff * BUFF_DUR;
  let T2: number, hpLeft: number;
  if (dmgInBuff >= hpBack) {
    T2 = hpBack / dpsBuff;
    hpLeft = 0;
  } else {
    T2 = BUFF_DUR;
    hpLeft = hpBack - dmgInBuff;
  }
  const T3 = hpLeft > 0 ? hpLeft / dpsFront : 0;
  return { T_total: T1 + T2 + T3, T1, T2, T3, diedInBuff: hpLeft === 0 };
}

const dps = durvsDPS();
console.log('='.repeat(90));
console.log('斗牛级单舰DPS分析');
console.log('='.repeat(90));
console.log(`武器1(70-100%命中): 稳态 ${(dps.w1).toFixed(1)} DPS = ${Math.round(dps.w1 * 60)}/分钟`);
console.log(`武器2(50-70%命中, 3门): 稳态 ${(dps.w2).toFixed(1)} DPS = ${Math.round(dps.w2 * 60)}/分钟`);
console.log(`单舰总稳态: ${(dps.total).toFixed(1)} DPS = ${Math.round(dps.total * 60)}/分钟`);
console.log(`(注: 首次锁定4s/3s有渐入, 长战斗可忽略; 短战斗需精确建模)`);

console.log('\n' + '='.repeat(90));
console.log('不同集火规模下的战斗时长 + 信号差');
console.log('='.repeat(90));
console.log('斗牛数 | 总DPS/分钟 | 加法T | 乘法T | T差距 | buff窗内死? | 命中差距');
console.log('-'.repeat(90));

// 武器1对驱逐70-100%(0.85), 武器2对驱逐50-70%(0.60)
// 但目标船是驱逐舰(船A), 两类武器都生效
// 简化: 用加权平均命中(按DPS加权)
// 武器1占 dps.w1/dps.total, 武器2占 dps.w2/dps.total
const w1Frac = dps.w1 / dps.total;
const w2Frac = dps.w2 / dps.total;

for (const nShips of [1, 2, 3, 4, 5, 6, 8, 10]) {
  const totalDps = dps.total * nShips;
  const totalDpsMin = totalDps * 60;
  // 加权命中
  const baseMidAdd = (mid: number, k: number) => mid * (1 - DODGE_BASE - k);
  const baseMidMul = (mid: number, k: number) => mid * (1 - DODGE_BASE) * (1 - k);
  // 分武器算再按DPS加权合并命中率
  function simWeighted(model: 'add' | 'mul') {
    const f = 1 - SHIELD;
    const h1Front = 0.85 * (1 - DODGE_BASE);
    const h2Front = 0.60 * (1 - DODGE_BASE);
    const h1Buff = model === 'add' ? 0.85 * (1 - DODGE_BASE - BUFF_DODGE) : 0.85 * (1 - DODGE_BASE) * (1 - BUFF_DODGE);
    const h2Buff = model === 'add' ? 0.60 * (1 - DODGE_BASE - BUFF_DODGE) : 0.60 * (1 - DODGE_BASE) * (1 - BUFF_DODGE);
    const dpsFront = totalDps * f * (w1Frac * h1Front + w2Frac * h2Front);
    const dpsBuff = totalDps * f * (w1Frac * h1Buff + w2Frac * h2Buff);
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
  const ra = simWeighted('add');
  const rm = simWeighted('mul');
  const tGap = ra.T_total - rm.T_total;
  // 命中差距 = T差距带来的等效命中差
  const avgAdd = HP / (totalDps * (1 - SHIELD) * ra.T_total);
  const avgMul = HP / (totalDps * (1 - SHIELD) * rm.T_total);
  const hGap = (avgMul - avgAdd) * 100;
  const mark = hGap > 3 ? '✓' : hGap > 2 ? '~' : '✗';
  console.log(`${nShips.toString().padStart(2)}艘  | ${Math.round(totalDpsMin).toString().padStart(7)} | ${ra.T_total.toFixed(0).padStart(3)}s | ${rm.T_total.toFixed(0).padStart(3)}s | ${tGap.toFixed(1).padStart(4)}s | ${ra.diedInBuff ? '是' : '否 '}     | ${hGap.toFixed(1)}pp ${mark}`);
}

console.log('\n' + '='.repeat(90));
console.log('结论');
console.log('='.repeat(90));
console.log('• 斗牛单舰 ~' + Math.round(dps.total * 60) + ' DPS/分钟, 武器1是大头(占' + (w1Frac * 100).toFixed(0) + '%)');
console.log('• 要压到buff窗内死亡(信号≥4pp), 需要约___艘集火(见上表命中差距≥3pp行)');
console.log('• 斗牛已标定(之前测过), 零额外成本');
