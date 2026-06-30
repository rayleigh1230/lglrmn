/**
 * 临时buff战斗模拟 —— 复现实测 +0% 和 +30% 两档
 *
 * 目的: 用精确的DES模拟(含首次锁定、冷却周期、RNG命中率)复现实测时长,
 *       验证"临时闪避buff加法进−槽"假设, 并与实测74.5s/52s对比。
 *
 * 攻击方: 10艘满面板斗牛
 *   武器1: dph525 / 持续0 / 弹药1次数1→1发 / 冷却2.7 / 锁定4 / 数量1 / 命中70-100% / 能量
 *   武器2: dph28  / 持续0 / 弹药1次数1→1发 / 冷却2.1 / 锁定3 / 数量3 / 命中50-70% / 能量
 *
 * 防御方: 结构52223 / 抵抗45(对能量无效) / 护盾3% / 闪避20%
 *   策略: 结构<60%触发, 闪避+40%持续45s
 *
 * 关键修正: 斗牛是能量武器 → 抵抗45不生效, 只有护盾3%减伤
 *   perHit(武器1) = 525 × (1−0.03) = 509.25
 *   perHit(武器2) = 28  × (1−0.03) = 27.16
 *
 * 用法：npx tsx tests/tempbuff-simulate.ts
 */

// ---- 攻击方武器定义 ----
interface WeaponDef {
  dph: number;
  cooldown: number;
  lockOn: number;
  count: number;      // 数量(门)
  hitMin: number;
  hitMax: number;
}

const weapons: WeaponDef[] = [
  { dph: 525, cooldown: 2.7, lockOn: 4, count: 1, hitMin: 0.70, hitMax: 1.00 },
  { dph: 28,  cooldown: 2.1, lockOn: 3, count: 3, hitMin: 0.50, hitMax: 0.70 },
];

const N_SHIPS = 10;
const TARGET_HP = 52223;
const TRIG_FRAC = 0.60;     // 60%血触发
const DODGE_BASE = 0.20;
const BUFF_DODGE = 0.40;
const BUFF_DUR = 45;
const SHIELD = 0.03;        // 能量武器减伤3%
const CEIL = 0.95;
const FLOOR = 0.10;

// 简单确定性RNG(Mulberry32)
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 模拟一场战斗, 返回 [总时长, 进入60%血时刻, 死亡时刻]
 * buff模型: 'add' (加法进−槽) 或 'mul' (乘法)
 * hitBonus: 攻击方命中加成(加法进+槽)
 */
function simulate(seed: number, hitBonus: number, model: 'add' | 'mul') {
  const rng = makeRng(seed);
  let hp = TARGET_HP;
  let buffActive = false;
  let buffEnd = Infinity;
  let trigTime = -1;
  const t0 = 0;
  // 用细粒度时间步进(0.05s), 每步结算所有到点开火的武器
  // 更精确: 事件驱动, 每艘每武器独立排开火事件
  // 为简化用事件队列
  type Evt = { time: number; ship: number; wi: number; ci: number };
  const events: Evt[] = [];
  for (let s = 0; s < N_SHIPS; s++) {
    for (let wi = 0; wi < weapons.length; wi++) {
      const w = weapons[wi];
      for (let ci = 0; ci < w.count; ci++) {
        events.push({ time: w.lockOn, ship: s, wi, ci });
      }
    }
  }
  // 按时间排序(稳定)
  events.sort((a, b) => a.time - b.time);

  let ei = 0;
  let currentTime = 0;
  let maxIter = 500000;

  while (hp > 0 && maxIter-- > 0) {
    if (ei >= events.length) break;
    const evt = events[ei];
    currentTime = evt.time;

    // buff到期检查
    if (buffActive && currentTime >= buffEnd) {
      buffActive = false;
    }

    // 处理当前时刻所有事件
    while (ei < events.length && events[ei].time <= currentTime + 1e-9) {
      const e = events[ei];
      const w = weapons[e.wi];
      // 区间roll命中base
      const base = w.hitMin + rng() * (w.hitMax - w.hitMin);
      // 计算最终命中率
      const effDodge = buffActive && model === 'add' ? DODGE_BASE + BUFF_DODGE : DODGE_BASE;
      const buffMul = buffActive && model === 'mul' ? (1 - BUFF_DODGE) : 1;
      let hitRate = base * (1 + hitBonus - effDodge) * buffMul;
      hitRate = Math.min(Math.max(hitRate, FLOOR), CEIL);
      // 命中判定
      if (rng() < hitRate) {
        const dmg = w.dph * (1 - SHIELD);
        hp -= dmg;
        // 触发检查
        if (!buffActive && trigTime < 0 && hp <= TARGET_HP * TRIG_FRAC) {
          buffActive = true;
          buffEnd = currentTime + BUFF_DUR;
          trigTime = currentTime;
        }
        if (hp <= 0) break;
      }
      // 排下一发(同武器同门, cooldown后)
      events.push({ time: currentTime + w.cooldown, ship: e.ship, wi: e.wi, ci: e.ci });
      ei++;
    }
    // 重新排序剩余事件
    if (ei < events.length) {
      events.sort((a, b) => a.time - b.time);
      // 注意: 已处理的事件在前面, ei之前的已"消费", 但数组里还在
      // 简化: 每次只对ei之后排序, 用splice移除已消费
    }
    // 清理已消费事件
    if (ei > 0) {
      events.splice(0, ei);
      ei = 0;
    }
  }

  return { totalTime: currentTime, trigTime, diedTime: currentTime };
}

console.log('='.repeat(85));
console.log('临时buff战斗模拟(DES事件驱动, 含首次锁定/RNG区间roll)');
console.log('='.repeat(85));
console.log(`攻击方: ${N_SHIPS}艘满面板斗牛`);
console.log(`武器1: dph525/冷却2.7/锁定4/1门/70-100% → perHit=${(525*(1-SHIELD)).toFixed(1)}`);
console.log(`武器2: dph28 /冷却2.1/锁定3/3门/50-70% → perHit=${(28*(1-SHIELD)).toFixed(1)}`);
console.log(`目标: HP${TARGET_HP}/护盾3%/闪避20%, 60%触发buff+40%/45s`);
console.log('');

for (const hitBonus of [0, 0.30]) {
  for (const model of ['add', 'mul'] as const) {
    const times: number[] = [];
    const trigs: number[] = [];
    for (let seed = 1; seed <= 5; seed++) {
      const r = simulate(seed, hitBonus, model);
      times.push(r.totalTime);
      if (r.trigTime > 0) trigs.push(r.trigTime);
    }
    const meanT = times.reduce((a, b) => a + b, 0) / times.length;
    const meanTrig = trigs.length ? trigs.reduce((a, b) => a + b, 0) / trigs.length : -1;
    console.log(`+${(hitBonus*100).toFixed(0)}%命中 [${model}]: T=${times.map(t=>Math.round(t)).join('/')}s 均值${meanT.toFixed(1)}s, 触发~${meanTrig.toFixed(1)}s`);
  }
  console.log('');
}

console.log('='.repeat(85));
console.log('对照实测:');
console.log('+0%命中: 实测74/74/74/75/75 均值74.5s, 触发~20s');
console.log('+30%命中: 实测52/52/52/52 均值52.0s, 触发~20s');
