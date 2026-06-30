/**
 * 临时 buff 测试【反问题】：要把战斗压到 80-100s，需要多大面板 DPS？
 *
 * 目标船(船A型): 结构52223, 抵抗45, 护盾3%, 闪避20%
 *   策略: 结构<60%触发, 闪避+40%持续45s
 *
 * 武器对驱逐舰命中区间: 50-70% 或 70-100% (中值 0.60 / 0.85)
 * 面板DPS = 武器在100%命中下的每分钟伤害(武器原始输出, 不含目标防御)
 *
 * 【三段时间结构】(之前模型漏了第3段):
 *   段1 前段: 100%→60%HP, 闪避20%, 掉血快
 *   段2 buff窗: 触发后闪避60%, 持续45s, 掉血慢
 *   段3 尾巴: 若45s没死, 闪避恢复20%, 掉血又快
 *
 * 实际有效DPS = 面板DPS/秒 × 命中率 × 防御系数f
 *   能量武器: f = 1 − 护盾3% = 0.97 (几乎全额)
 *   实弹武器: f = (dph−45)/dph, dph越小损失越大
 *
 * 用法：npx tsx tests/tempbuff-dps-requirement.ts
 */
const HP = 52223;
const TRIG = 0.60;        // 60%HP触发
const DODGE_BASE = 0.20;  // 基础闪避
const BUFF_DODGE = 0.40;  // buff加成
const BUFF_DUR = 45;      // buff持续秒

/** 三段模型: 给定面板DPS/秒(Ps)、防御系数(f)、基础命中(baseMid)、buff模型, 返回时间结构 */
function simulate(Ps: number, f: number, baseMid: number, model: 'add' | 'mul') {
  const hitFront = baseMid * (1 - DODGE_BASE);
  const hitBuff = model === 'add'
    ? baseMid * (1 - DODGE_BASE - BUFF_DODGE)
    : baseMid * (1 - DODGE_BASE) * (1 - BUFF_DODGE);

  const hpFront = HP * (1 - TRIG); // 40% = 20889
  const hpBack = HP * TRIG;        // 60% = 31334

  const dpsFront = Ps * f * hitFront;
  const dpsBuff = Ps * f * hitBuff;

  // 段1 前段
  const T1 = hpFront / dpsFront;
  // 段2 buff窗: 45s内能打掉多少
  const dmgInBuff = dpsBuff * BUFF_DUR;
  let T2: number, hpLeft: number;
  if (dmgInBuff >= hpBack) {
    T2 = hpBack / dpsBuff; // buff窗内死亡
    hpLeft = 0;
  } else {
    T2 = BUFF_DUR;
    hpLeft = hpBack - dmgInBuff;
  }
  // 段3 尾巴
  const T3 = hpLeft > 0 ? hpLeft / dpsFront : 0;

  return { T_total: T1 + T2 + T3, T1, T2, T3, diedInBuff: hpLeft === 0 };
}

/** 找让 T_total ≈ targetT 的面板DPS/秒(二分扫描) */
function findPs(targetT: number, f: number, baseMid: number, model: 'add' | 'mul'): number {
  let lo = 100, hi = 100000;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const r = simulate(mid, f, baseMid, model);
    if (r.T_total > targetT) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

const ranges = [
  { name: '50-70%命中', baseMid: 0.60 },
  { name: '70-100%命中', baseMid: 0.85 },
];

console.log('='.repeat(96));
console.log('一、能量武器(护盾3%几乎无损, f=0.97)所需面板DPS');
console.log('='.repeat(96));
console.log('命中区间 | 目标T | 面板DPS/分钟 | 加法预测T | 乘法预测T | T差距 | 平均命中差距');
console.log('-'.repeat(96));
for (const r of ranges) {
  for (const targetT of [100, 90, 80]) {
    // 用加法模型定标面板DPS(让加法预测=T)
    const Ps = findPs(targetT, 0.97, r.baseMid, 'add');
    const Pmin = Ps * 60; // 每分钟
    const ra = simulate(Ps, 0.97, r.baseMid, 'add');
    const rm = simulate(Ps, 0.97, r.baseMid, 'mul');
    const tGap = ra.T_total - rm.T_total;
    const avgAdd = HP / (Ps * 0.97 * ra.T_total);
    const avgMul = HP / (Ps * 0.97 * rm.T_total);
    const hGap = (avgMul - avgAdd) * 100;
    console.log(`${r.name} | ${targetT}s | ${Math.round(Pmin).toString().padStart(6)} |   ${ra.T_total.toFixed(0)}s    |   ${rm.T_total.toFixed(0)}s    | ${tGap.toFixed(1)}s |   ${hGap.toFixed(1)}pp`);
  }
}

console.log('\n' + '='.repeat(96));
console.log('二、不同防御系数f下的面板DPS修正(50-70%区间, T=90s为例)');
console.log('='.repeat(96));
console.log('武器类型 | 防御系数f | 面板DPS/分钟 | 说明');
console.log('-'.repeat(96));
const Ps_energy = findPs(90, 0.97, 0.60, 'add');
for (const [type, f, note] of [
  ['能量武器', 0.97, '护盾3%, 几乎全额'],
  ['实弹 dph≈300', 0.85, '(300−45)/300=0.85'],
  ['实弹 dph≈200', 0.775, '(200−45)/200=0.775'],
  ['实弹 dph≈100', 0.55, '(100−45)/100=0.55, 损失大'],
] as [string, number, string][]) {
  const Ps = findPs(90, f, 0.60, 'add');
  console.log(`${type.padEnd(14)} |   ${f.toFixed(2)}   | ${Math.round(Ps * 60).toString().padStart(6)} | ${note}`);
}

console.log('\n' + '='.repeat(96));
console.log('三、关键结论: 信号(T差距/命中差距)随面板DPS变化');
console.log('='.repeat(96));
console.log('面板DPS越高 → 战斗越短 → 越接近"buff窗内死亡" → 信号越强');
console.log('');
console.log('50-70%区间, 能量武器, 不同面板DPS下的信号:');
console.log('面板DPS/分钟 | 加法T | 乘法T | T差距 | 命中差距 | buff窗内死?');
console.log('-'.repeat(96));
for (const Pmin of [60000, 80000, 100000, 120000, 150000, 180000, 220000]) {
  const Ps = Pmin / 60;
  const ra = simulate(Ps, 0.97, 0.60, 'add');
  const rm = simulate(Ps, 0.97, 0.60, 'mul');
  const tGap = ra.T_total - rm.T_total;
  const avgAdd = HP / (Ps * 0.97 * ra.T_total);
  const avgMul = HP / (Ps * 0.97 * rm.T_total);
  const hGap = (avgMul - avgAdd) * 100;
  const mark = hGap > 3 ? '✓强' : hGap > 2 ? '~可' : '✗弱';
  console.log(`${Pmin.toString().padStart(6)}    | ${ra.T_total.toFixed(0).padStart(3)}s | ${rm.T_total.toFixed(0).padStart(3)}s | ${tGap.toFixed(1).padStart(4)}s | ${hGap.toFixed(1).padStart(5)}pp | ${ra.diedInBuff ? '是' : '否 '}  ${mark}`);
}

console.log('\n' + '='.repeat(96));
console.log('四、最优区间推荐');
console.log('='.repeat(96));
console.log('要在80-100s内且信号≥3pp, 推荐:');
console.log('  • 优先选【能量武器】(护盾3%几乎无损, 面板DPS即有效DPS)');
console.log('  • 50-70%命中区间: 面板DPS合计 ~10-13万/分钟 → T≈80-100s, 命中差距3-4pp');
console.log('  • 70-100%命中区间: 面板DPS合计 ~7.5-9.5万/分钟 → T≈80-100s, 命中差距2-3pp');
console.log('  • 50-70%区间信号更强(基数低, buff相对影响大), 优先用');
console.log('  • 实弹武器需按上表调高面板DPS(dph越小加得越多)');
