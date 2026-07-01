/**
 * 康纳马拉混沌级轨道炮巡洋舰 X8  vs  CV3000航母 X1
 * —— 第一场实测校准（2026-07-01）
 *
 * 【实测数据】
 *   攻击方：康纳马拉轨道炮巡洋舰 ×8
 *     武器1（直射实弹）：dph=1200, 持续0, 弹药2, 次数1, 冷却8.4, 锁定8, 对大命中50%-70%, 命中提升0
 *     武器2：命中黑箱（对大无标定），本次总伤害 3584，量级极小，本次分析忽略
 *   防守方：CV3000航母 ×1
 *     结构值 370192, 抵抗 270, 无闪避
 *   结果：战斗时长 5:42(342s), 武器1总伤害 366608, 武器2总伤害 3584
 *   核验：366608 + 3584 = 370192 = 航母结构值 ✓（航母被击毁，"打到死"场景）
 *
 * 【本脚本目标】
 *   从实测总伤害反推【武器1的实际平均命中率】，对照50%-70%区间的各候选值。
 *
 * 【建模】
 *   单发实弹伤害 = dph − resistance = 1200 − 270 = 930（破甲成立）
 *   每周期开火：持续0+弹药2+次数1 → 2发同时打出（shotsPerCycle=2）
 *   周期：首轮 lock(8) + cooldown(8.4) 后出2发 → 首轮2发在 t=8
 *         之后每 8.4s 一轮2发
 *   无暴击（直射实弹、命中提升0、无暴击词条 → critRate=0）
 *
 *   武器1总伤害 = 命中发数 × 930
 *   ⇒ 命中发数 = 366608 / 930
 *   ⇒ 总开火发数 = 命中发数 / 命中率
 *
 *   关键判据：总开火发数必须能被"周期节奏"解释。
 *     每艘8艘 × 2发/周期 = 16发/周期（全舰队）
 *     在 T 秒内的总周期数 = 1（首轮） + floor((T − 8) / 8.4)（后续轮）
 *     总发数 = 16 × 周期数
 *   ⇒ 由"实测命中发数 ÷ 总发数"反推命中率
 *
 * 【为什么这场适合校准（目标1）】
 *   - 无闪避：命中率公式 final = base×(1 + k − dodge) 中 dodge=0，直接读 base
 *   - 单靶：无目标选择随机（§1.2），完全确定
 *   - 无暴击：伤害=命中发数×930，干净线性反推
 *   - 击毁场景：击杀时间法适用
 *
 * 用法：npx tsx tests/analysis/calibrate-cruiser-vs-carrier-N8.ts
 */

// ===== 实测参数 =====
const DPH = 1200;
const RESISTANCE = 270;
const PER_HIT = DPH - RESISTANCE; // 930，单发实弹伤害（破甲成立）

const FIRE_DURATION = 0; // 持续0
const AMMO = 2; // 弹药2
const ROUNDS = 1; // 次数1
const SHOTS_PER_CYCLE = AMMO * ROUNDS; // 2 发/周期/武器
const COOLDOWN = 8.4;
const LOCK_ON = 8; // 锁定（仅首次）
const N_ATTACKERS = 8; // 攻击方舰船数

const HP = 370192; // 航母结构值
const T_OBS = 5 * 60 + 42; // 342s，实测战斗时长
const W1_DAMAGE = 366608; // 武器1总伤害（实测）
const W2_DAMAGE = 3584; // 武器2总伤害（实测，黑箱，本次忽略）

// ===== 计算周期节奏 =====
// 首轮在 t=LOCK_ON=8s 出2发；之后每 COOLDOWN=8.4s 一轮2发
// 注意：引擎"打到死"取的是击毁时刻。我们需要算出"到击毁为止共打了多少周期"
// 战斗时长 T_OBS=342s 含后摇5s（文档§1.3结论），净击毁时刻 = 342 − 5 = 337s
const POST_DELAY = 5; // 后摇5s（文档§1.3已锁定）
const NET_KILL_TIME = T_OBS - POST_DELAY; // 337s 击毁时刻

/**
 * 计算到 time 秒为止，单艘巡洋舰武器1总共打出的发数。
 * 首轮：t=LOCK_ON 出 SHOTS_PER_CYCLE 发
 * 后续：每 COOLDOWN 一轮 SHOTS_PER_CYCLE 发
 */
function shotsFiredByTime(time: number): number {
  let total = 0;
  // 首轮（含锁定）
  if (time < LOCK_ON) return 0;
  total += SHOTS_PER_CYCLE; // 首轮在 t=LOCK_ON 打出
  // 后续轮：t = LOCK_ON + k*COOLDOWN (k=1,2,...)
  let t = LOCK_ON + COOLDOWN;
  while (t <= time + 1e-6) {
    total += SHOTS_PER_CYCLE;
    t += COOLDOWN;
  }
  return total;
}

// ===== 主分析 =====
console.log('='.repeat(96));
console.log('康纳马拉轨道炮巡洋舰 X8  vs  CV3000航母 X1 —— 第一场校准');
console.log('='.repeat(96));

console.log('\n【参数核对】');
console.log(`  单发实弹伤害 = dph(${DPH}) − resistance(${RESISTANCE}) = ${PER_HIT}`);
console.log(`  每周期发数 = 弹药${AMMO} × 次数${ROUNDS} = ${SHOTS_PER_CYCLE} 发/周期/武器`);
console.log(`  周期节奏：首轮 lock${LOCK_ON}s → 2发；之后每 ${COOLDOWN}s → 2发`);
console.log(`  攻击方：${N_ATTACKERS} 艘巡洋舰，每艘1门武器1`);
console.log(`  全舰队每周期发数 = ${N_ATTACKERS} × ${SHOTS_PER_CYCLE} = ${N_ATTACKERS * SHOTS_PER_CYCLE} 发/周期`);

console.log('\n【实测时长拆解】');
console.log(`  战报时长 = ${T_OBS}s (5:42)`);
console.log(`  后摇 = ${POST_DELAY}s (文档§1.3结论)`);
console.log(`  净击毁时刻 = ${T_OBS} − ${POST_DELAY} = ${NET_KILL_TIME}s`);

console.log('\n【周期数 & 总发数】');
const shotsPerShip = shotsFiredByTime(NET_KILL_TIME);
const totalShotsAll = shotsPerShip * N_ATTACKERS;
const cycleCount = shotsPerShip / SHOTS_PER_CYCLE; // 单艘打了几个周期
console.log(`  到 t=${NET_KILL_TIME}s 为止，单艘打了 ${cycleCount} 个周期 = ${shotsPerShip} 发`);
console.log(`  全舰队总发数 = ${shotsPerShip} × ${N_ATTACKERS} = ${totalShotsAll} 发`);

console.log('\n【由实测伤害反推命中率】');
const hitShots = W1_DAMAGE / PER_HIT;
console.log(`  武器1命中发数 = 总伤害${W1_DAMAGE} / 单发${PER_HIT} = ${hitShots.toFixed(2)} 发`);
const measuredHitRate = hitShots / totalShotsAll;
console.log(`  实测平均命中率 = 命中发数 / 总发数 = ${hitShots.toFixed(2)} / ${totalShotsAll}`);
console.log(`                  = ${(measuredHitRate * 100).toFixed(2)}%`);

console.log('\n' + '='.repeat(96));
console.log('【对照命中区间 50%-70%】');
console.log('='.repeat(96));
const candidates = [
  { name: '下限 0.50 (文档§1.4 多舰base结论)', val: 0.5 },
  { name: '1/3位 0.567', val: 0.5667 },
  { name: '中值 0.60', val: 0.6 },
  { name: '2/3位 0.633', val: 0.6333 },
  { name: '上限 0.70', val: 0.7 },
];
console.log('  候选      |   值    | 与实测偏差 | 预测总伤害(=总发数×值×930)');
console.log('-'.repeat(96));
for (const c of candidates) {
  const diff = Math.abs(measuredHitRate - c.val);
  const predictedDmg = totalShotsAll * c.val * PER_HIT;
  const marker = diff < 0.02 ? '  ✓ 最近' : '';
  console.log(
    `  ${c.name.padEnd(36)} | ${c.val.toFixed(3)} |  ${(diff * 100).toFixed(2)}pp  |  ${Math.round(predictedDmg)}${marker}`
  );
}

console.log('\n' + '='.repeat(96));
console.log('【反向验证：用实测命中率预测击毁时刻】');
console.log('='.repeat(96));
// 若命中率=measuredHitRate，需要多少发命中才能打掉航母HP？
const requiredHitShots = HP / PER_HIT; // 武器1需要命中的发数（忽略武器2的3584）
const requiredHitShotsW1Only = (HP - W2_DAMAGE) / PER_HIT; // 武器1实际承担的部分
console.log(`  航母HP=${HP}，武器2贡献${W2_DAMAGE}，武器1需承担 ${HP - W2_DAMAGE}`);
console.log(`  武器1需命中发数 = ${(HP - W2_DAMAGE)} / ${PER_HIT} = ${requiredHitShotsW1Only.toFixed(2)} 发`);
const requiredTotalShots = requiredHitShotsW1Only / measuredHitRate;
console.log(`  对应总发数 = ${requiredHitShotsW1Only.toFixed(2)} / ${measuredHitRate.toFixed(4)} = ${requiredTotalShots.toFixed(0)} 发`);
const requiredPerShip = requiredTotalShots / N_ATTACKERS;
const requiredCycles = Math.ceil(requiredPerShip / SHOTS_PER_CYCLE);
// 击毁时刻 = LOCK_ON + (requiredCycles-1)*COOLDOWN
const impliedKillTime = LOCK_ON + (requiredCycles - 1) * COOLDOWN;
console.log(`  单艘需打 ${requiredCycles} 个周期（${requiredCycles * SHOTS_PER_CYCLE}发）`);
console.log(`  隐含击毁时刻 = lock${LOCK_ON} + ${requiredCycles - 1}×cooldown${COOLDOWN} = ${impliedKillTime}s`);
console.log(`  隐含战报时长 = ${impliedKillTime} + 后摇${POST_DELAY} = ${impliedKillTime + POST_DELAY}s = ${Math.floor((impliedKillTime + POST_DELAY) / 60)}:${String((impliedKillTime + POST_DELAY) % 60).padStart(2, '0')}`);
console.log(`  实测战报时长 = ${T_OBS}s`);
console.log(`  偏差 = ${Math.abs(impliedKillTime + POST_DELAY - T_OBS).toFixed(1)}s`);

console.log('\n' + '='.repeat(96));
console.log('【结论】');
console.log('='.repeat(96));
// 找最近的候选
let best = candidates[0];
for (const c of candidates) {
  if (Math.abs(measuredHitRate - c.val) < Math.abs(measuredHitRate - best.val)) best = c;
}
console.log(`实测命中率 ${(measuredHitRate * 100).toFixed(2)}% 最接近 ${best.name} (${best.val})`);
console.log(`注意：本场 dodge=0，所以 final = base×(1+k−0) = base（k=命中提升0）`);
console.log(`      ⇒ 实测命中率 ${measuredHitRate.toFixed(4)} 直接读出 base 值`);
