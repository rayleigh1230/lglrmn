/**
 * 第二轮实测回归测试 —— 驱逐舰 vs FG300
 *
 * 实测场景（2026-06 第二组采样，与前一组 FG300 vs 驱逐舰 互为攻防翻转）：
 *   攻击方：驱逐舰，5 个相同主武器
 *     单武器：dph=105、冷却6s、无攻击持续时间（单发/循环）、锁定3s、命中率50-70%（面板区间）
 *   防守方：FG300，抵抗8、闪避8%、结构值14263
 *   结果：FG300 在 5分22秒（322s）被击毁，总伤害 = 14263（=结构值）
 *
 * 这组数据专门验证两条公式的正确性（与第一组测试互补）：
 *   1. 抵抗减伤主公式：实际单发 = dph − resistance（破甲分支）
 *      → 105 − 8 = 97，引擎与实测反推一致
 *   2. 命中/闪避公式：最终命中率 = base × (1 − dodge)
 *      → 区间中值 0.6 × (1 − 0.08) = 55.2%，蒙特卡洛收敛
 *
 * 命中率用面板真实区间 {min:0.5, max:0.7} 建模，每发独立 roll。
 *
 * 第一组测试（FG300 vs 驱逐舰）走的是"保底伤害"分支（dph30 < 抵抗36），
 * 本组走的是"破甲减法"分支（dph105 > 抵抗8），两条分支被独立验证。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulate, createRNG, damageCalc, computeHitRate } from '../src/index.js';
import { makeWeapon, makeShip, makeFleet, cell } from './fixtures.js';

/** FG300 结构值 = 实测总伤害（被击毁即打满） */
const FG300_STRUCTURE = 14263;
/** 实测战斗时长（5分22秒） */
const BATTLE_DURATION = 322;

/** 驱逐舰主武器：dph105 / 冷却6s / 单发（无持续时间）/ 锁定3s / 命中50-70%区间 */
function ddWeapon(id: string) {
  return makeWeapon({
    id,
    dph: 105,
    shotsPerCycle: 1,
    fireDuration: 0, // 无攻击持续时间：循环内只打1发
    cooldown: 6,
    lockOnTime: 3,
    baseHit: { frigate: { min: 0.5, max: 0.7 } }, // 面板命中率区间 50%-70%
    damageType: 'kinetic',
  });
}

/** 驱逐舰：5 个相同主武器 */
function ddShip() {
  return makeShip({
    id: '驱逐舰',
    cell: cell('ally', 'front', 1),
    class: 'destroyer',
    weapons: [ddWeapon('W1'), ddWeapon('W2'), ddWeapon('W3'), ddWeapon('W4'), ddWeapon('W5')],
  });
}

/** FG300 防守：抵抗8、闪避8%、结构14263 */
function fg300Target() {
  return makeShip({
    id: 'FG300',
    cell: cell('enemy', 'front', 1),
    class: 'frigate',
    structure: FG300_STRUCTURE,
    resistance: 8,
    dodge: 0.08,
    weapons: [],
  });
}

/** 从战报读 FG300 剩余结构（被击毁时 survivors 中无该舰，记为 0） */
function fg300Remaining(report: ReturnType<typeof simulate>): number {
  const s = report.survivors.enemy.find((x) => x.shipId === 'FG300');
  return s ? s.structure : 0;
}

test('驱逐舰 vs FG300：抵抗减伤主公式 dph − resistance = 97', () => {
  // 破甲分支：dph105 > 抵抗8，走减法不走保底
  const weapon = ddWeapon('W1');
  const target = fg300Target();
  const dmg = damageCalc(weapon, target, false);
  // 105 − 8 = 97
  assert.equal(dmg.final, 97, '破甲单发应为 105−8=97');
  assert.equal(dmg.floored, false, '破甲不应触发保底');
});

test('驱逐舰 vs FG300：命中闪避公式 中值0.6×(1−0.08)=55.2%（computeHitRate用中值）', () => {
  const weapon = ddWeapon('W1');
  const target = fg300Target();
  const rate = computeHitRate(weapon, target);
  // 区间{0.5,0.7}中值0.6 × (1 − 0.08) = 0.552
  assert.ok(
    Math.abs(rate - 0.552) < 1e-9,
    `命中率应为 0.552，实际 ${rate}`
  );
});

test('驱逐舰 vs FG300：蒙特卡洛命中率收敛到区间中值55.2%（±3pp）', () => {
  const attacker = ddShip();
  const defender = fg300Target();

  const TRIALS = 60;
  let sumHits = 0;
  let sumShots = 0;
  for (let seed = 1; seed <= TRIALS; seed++) {
    // 血量拉到极高，确保跑满全程，命中率统计才不被击毁截断
    const godDefender = makeShip({ ...defender, structure: 1e9 });
    const report = simulate(makeFleet([attacker]), makeFleet([godDefender]), {
      maxTime: BATTLE_DURATION,
      rng: createRNG(seed),
    });
    sumHits += report.attacks.filter((a) => a.hit).length;
    sumShots += report.attacks.length;
  }
  const measured = sumHits / sumShots;
  const formula = 0.552; // 区间中值 0.6 × (1−0.08)
  // 区间模式下单发命中率有方差（每发在区间roll），收敛带略宽到 ±3pp
  assert.ok(
    Math.abs(measured - formula) < 0.03,
    `60次平均命中率 ${(measured * 100).toFixed(2)}% 应接近区间中值 ${(formula * 100).toFixed(2)}%（±3pp）`
  );
});

test('驱逐舰 vs FG300：总伤害对齐实测 14263（±5%）', () => {
  // 手工推演：(322−3)/6 ≈ 53 发/武器 × 5 武器 = 265 发；
  //         命中 265×0.552 ≈ 146 发 × 97 = 14162（≈14263）
  const attacker = ddShip();
  const defender = fg300Target();

  const TRIALS = 60;
  let sumDamage = 0;
  let killCount = 0;
  for (let seed = 1; seed <= TRIALS; seed++) {
    const report = simulate(makeFleet([attacker]), makeFleet([defender]), {
      maxTime: BATTLE_DURATION,
      rng: createRNG(seed),
    });
    const dmg = FG300_STRUCTURE - fg300Remaining(report);
    sumDamage += dmg;
    if (dmg >= FG300_STRUCTURE) killCount++;
  }
  const avg = sumDamage / TRIALS;
  // 总伤害应在实测 14263 的 ±5% 内
  assert.ok(
    avg > FG300_STRUCTURE * 0.95 && avg < FG300_STRUCTURE * 1.05,
    `60次平均总伤害 ${avg.toFixed(0)} 应在 14263×[0.95,1.05]=[13550,14976] 内`
  );
  // 大部分种子应在 322s 内完成击毁（公式链整体正确）
  assert.ok(
    killCount / TRIALS > 0.5,
    `60次中击毁占比 ${(killCount / TRIALS * 100).toFixed(0)}% 应 > 50%`
  );
});

test('驱逐舰 vs FG300：首次开火在 t=3s（锁定时间）', () => {
  const attacker = ddShip();
  const defender = fg300Target();
  const report = simulate(makeFleet([attacker]), makeFleet([defender]), {
    maxTime: 10,
    rng: createRNG(1),
  });
  const firstFire = Math.min(...report.attacks.map((a) => a.time));
  assert.equal(firstFire, 3, `首次开火应在 t=3（锁定后），实际 t=${firstFire}`);
  assert.equal(report.attacks.filter((a) => a.time < 3).length, 0, '锁定期间不应开火');
});

test('驱逐舰 vs FG300：循环节奏每 6s 一发（冷却6s，无持续时间）', () => {
  const attacker = ddShip();
  const defender = fg300Target();
  const report = simulate(makeFleet([attacker]), makeFleet([defender]), {
    maxTime: 25,
    rng: createRNG(1),
  });
  // 单个武器 W1 的开火时间序列应为 t=3,9,15,21（每6s一发）
  const w1Times = report.attacks
    .filter((a) => a.attackerWeaponId === 'W1')
    .map((a) => a.time);
  assert.deepEqual(w1Times.slice(0, 4), [3, 9, 15, 21], 'W1 应每6s打一发：3,9,15,21');
});
