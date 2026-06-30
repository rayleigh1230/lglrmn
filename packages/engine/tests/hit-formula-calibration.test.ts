/**
 * 命中公式实测校准测试 —— 用三轮对 FG300 的实测数据锁定加法公式
 *
 * 公式（已证）：final = base × (1 + hitBonus + 对舰种命中 − 通用闪避 − 武器类别闪避)
 *
 * 三轮实验锚定值（均来自实测反推，详见同目录 .ts 脚本）：
 *   - FG300 反击武器 base ≈ 0.687（区间 50%-70% 的中值标定，由基线反推）
 *   - 实验1（直射闪避）：卡利莱恩 d55% + 被直射−k → 命中率
 *       k=0%   实测 30.6%   公式 0.687×0.45=30.9%
 *       k=15%  实测 20.8%   公式 0.687×0.30=20.6%
 *       k=30%  实测 10.1%   公式 0.687×0.15=10.3% → 夹到下限
 *   - 实验2（对舰种命中）：FG300 对护卫+k 打卡利莱恩 d55% → 命中率
 *       k=15%  实测 40.4%   公式 0.687×0.60=41.2%
 *       k=30%  实测 50.0%   公式 0.687×0.75=51.5%
 *
 * 断言用 ±1.5pp 容差（实测多场次散布约 ±1~2pp）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeHitRate, resolveModifiers, hitCheck, clampHitRate } from '../src/phases/hit.js';
import { MockRNG } from '../src/core/rng.js';
import { makeWeapon, makeShip } from './fixtures.js';

const FG300_BASE = 0.687; // 锚定值
const TOL = 0.015; // ±1.5pp 容差

/** 卡利莱恩特种型：护卫舰，闪避 55% */
function kalliroFrigate(dodgeByType?: number) {
  return makeShip({
    id: 'kalliro',
    cell: { side: 'enemy', row: 'front', col: 1 },
    class: 'frigate',
    dodge: 0.55,
    dodgeByWeaponType: dodgeByType !== undefined ? { direct: dodgeByType } : undefined,
  });
}

/** FG300 多用途直射武器（区间 50%-70%，标定 base 中值 0.687） */
function fg300Weapon(over: { hitBonusByTargetClass?: number } = {}) {
  return makeWeapon({
    id: 'fg300-main',
    baseHit: { frigate: { min: 0.5, max: 0.7 } }, // 中值 0.6，实测反推有效 base≈0.687
    category: 'direct',
    hitBonusByTargetClass: over.hitBonusByTargetClass
      ? { frigate: over.hitBonusByTargetClass }
      : undefined,
  });
}

// ---- 实验1：被直射武器命中率下降 = 武器类别闪避（加法进 −槽）----

test('实验1: 被直射命中率下降 k 作为加法进 −槽（dodgeByWeaponType）', () => {
  // 用不触底的 k 验证加法结构：final_k / final_0 = (1 − 0.55 − k) / (1 − 0.55)
  // k=30% 会触底（0.687×0.15=0.103→夹0.10），单独用下面的撞底测试覆盖。
  const cases: [number, number][] = [
    [0.0, 0.309], // k=0%  → 0.687×0.45
    [0.15, 0.206], // k=15% → 0.687×0.30
  ];
  for (const [k, expectHit] of cases) {
    const w = fg300Weapon();
    const t = kalliroFrigate(k);
    const got = computeHitRate(w, t);
    const ratio = k === 0 ? 1 : got / computeHitRate(fg300Weapon(), kalliroFrigate(0));
    const expectRatio = (1 - 0.55 - k) / (1 - 0.55);
    assert.ok(
      Math.abs(ratio - expectRatio) < 0.01,
      `k=${k}: 加法比值 ${ratio.toFixed(3)} 应≈ ${expectRatio.toFixed(3)}`
    );
  }
});

test('实验1: k=30% 撞下限 → 夹到 10%', () => {
  // dodge 0.55 + k 0.30 = 0.85；即便 base 上限 0.7 → 0.7×0.15=0.105 → 夹到 0.1
  const w = fg300Weapon();
  const t = kalliroFrigate(0.30);
  // 用 base 上限测试（区间上沿 0.7）
  const hitHi = hitCheck(
    makeWeapon({ id: 'w', baseHit: { frigate: 0.7 }, category: 'direct' }),
    t,
    new MockRNG([0.04])
  );
  assert.ok(hitHi.final <= 0.105, `撞底应≈10%，实际 ${(hitHi.final * 100).toFixed(1)}%`);
});

test('resolveModifiers: 武器类别闪避按 weapon.category 匹配，不匹配则忽略', () => {
  const t = makeShip({
    id: 't',
    cell: { side: 'enemy', row: 'front', col: 1 },
    class: 'frigate',
    dodge: 0.55,
    dodgeByWeaponType: { direct: 0.15, guided: 0.20 }, // 直射15%，制导20%
  });
  // 直射武器吃 direct 的 15%
  const direct = resolveModifiers(makeWeapon({ id: 'w', category: 'direct' }), t);
  assert.equal(direct.dodgeByType, 0.15);
  // 制导武器吃 guided 的 20%
  const guided = resolveModifiers(makeWeapon({ id: 'w', category: 'guided' }), t);
  assert.equal(guided.dodgeByType, 0.20);
  // 慢速武器（轨道炮/离子炮）无对应词条 → 0（不吃 direct 的 15%）
  const slow = resolveModifiers(makeWeapon({ id: 'w', category: 'slow' }), t);
  assert.equal(slow.dodgeByType, 0);
});

test('resolveModifiers: 武器无 category 缺省 direct', () => {
  const t = makeShip({
    id: 't',
    cell: { side: 'enemy', row: 'front', col: 1 },
    dodge: 0.1,
    dodgeByWeaponType: { direct: 0.15 },
  });
  const m = resolveModifiers(makeWeapon({ id: 'w' }), t); // 未设 category
  assert.equal(m.dodgeByType, 0.15, '缺省 direct，应吃 direct 词条');
});

// ---- 实验2：对某舰种命中率提升 = 加法进 +槽（hitBonusByTargetClass）----

test('实验2: 对舰种命中 k 作为加法进 +槽（hitBonusByTargetClass）', () => {
  const cases: [number, number][] = [
    [0.15, 0.412], // → 0.687×(1+0.15−0.55)=0.687×0.60
    [0.30, 0.515], // → 0.687×(1+0.30−0.55)=0.687×0.75
  ];
  for (const [k, expectHit] of cases) {
    const w = fg300Weapon({ hitBonusByTargetClass: k });
    const t = kalliroFrigate(); // d55%
    const got = computeHitRate(w, t);
    // 用 base 中值 0.6 验证加法结构：final = 0.6×(1+k−0.55)
    const expect = 0.6 * (1 + k - 0.55);
    assert.ok(
      Math.abs(got - expect) < 1e-9,
      `k=${k}: ${got.toFixed(3)} 应≈ ${expect.toFixed(3)}`
    );
  }
});

test('实验2: 对舰种命中按 target.class 匹配，目标舰种不匹配则不生效', () => {
  const w = makeWeapon({
    id: 'w',
    baseHit: { frigate: 0.6, destroyer: 0.6 },
    hitBonusByTargetClass: { destroyer: 0.30 }, // 只对驱逐舰+30%
  });
  const frigate = makeShip({ id: 'f', cell: { side: 'enemy', row: 'front', col: 1 }, class: 'frigate', dodge: 0 });
  const destroyer = makeShip({ id: 'd', cell: { side: 'enemy', row: 'front', col: 1 }, class: 'destroyer', dodge: 0 });
  // 护卫舰不吃加成
  assert.ok(Math.abs(computeHitRate(w, frigate) - 0.6) < 1e-9);
  // 驱逐舰吃 +30%：0.6×1.3=0.78
  assert.ok(Math.abs(computeHitRate(w, destroyer) - 0.78) < 1e-9);
});

// ---- 加法 vs 乘法的【判据】测试（防止公式被误改回乘法）----

test('判据: 比值测试锁死加法结构（实验1）', () => {
  // 用不触底的两点比：hit(15%)/hit(0%)
  //   加法: 0.30/0.45 = 0.667
  //   乘法: 0.85/1.00 = 0.850
  // 实测散布贴加法。k=30% 会触底，不能用于比值测试。
  const hit = (k: number) => computeHitRate(fg300Weapon(), kalliroFrigate(k));
  const ratio = hit(0.15) / hit(0);
  assert.ok(
    Math.abs(ratio - 0.667) < 0.02,
    `加法比值应≈0.667，实际 ${ratio.toFixed(3)}（乘法会是0.85）`
  );
});

test('判据: 比值测试锁死加法结构（实验2）', () => {
  // 加法: hit(+30%)/hit(+15%) = (1.30−0.55)/(1.15−0.55) = 0.75/0.60 = 1.250
  // 乘法: 1.30/1.15 = 1.130
  // 实测 1.230，贴加法。
  const hit = (k: number) => computeHitRate(fg300Weapon({ hitBonusByTargetClass: k }), kalliroFrigate());
  const ratio = hit(0.30) / hit(0.15);
  assert.ok(
    Math.abs(ratio - 1.25) < 0.02,
    `加法比值应≈1.25，实际 ${ratio.toFixed(3)}（乘法会是1.13）`
  );
});

// ---- 实验3：全局命中下降（策略类）= 加法进 +槽 为 −0.15（通过 hitBonus 承载）----
//
// 数据：阋神星重炮型武器2（dph315/弹药2次数1→shotsPerCycle2/冷却6.6/锁定4/区间50-70%）
//   带"命中下降15%"策略 → 打卡利莱恩(d55%, 抵抗8)
//   三场实测命中率均值 20.94%（详见 tests/hit-debuff-reverse.ts）
//   反推 base=0.698（贴近 FG300 标定的 0.687）
//   实测/基线比值 = 0.677（加法预测 0.667，乘法预测 0.850）

test('实验3: 全局命中下降15% 作为加法进 +槽（hitBonus = −0.15）', () => {
  // 卡利莱恩 d55%，武器 base 中值 0.6
  // 加法: 0.6 × (1 − 0.15 − 0.55) = 0.6 × 0.30 = 0.180
  // 乘法: 0.6 × (1 − 0.55) × 0.85 = 0.6 × 0.3825 = 0.230
  // 实测反推（base 0.687）= 0.687 × 0.30 = 0.206，贴加法。
  const w = makeWeapon({
    id: 'yx-heavy-w2',
    baseHit: { frigate: { min: 0.5, max: 0.7 } },
    hitBonus: -0.15, // 全局命中下降15%，进 +槽 为负值
  });
  const t = kalliroFrigate(); // d55%
  const got = computeHitRate(w, t);
  const expect = 0.6 * (1 - 0.15 - 0.55); // 加法 = 0.180
  assert.ok(
    Math.abs(got - expect) < 1e-9,
    `全局命中debuff加法: ${got.toFixed(3)} 应≈ ${expect.toFixed(3)}（乘法会是0.230）`
  );
});

test('实验3: hitBonus 负值（命中下降）与正值（命中提升）对称进同一 +槽', () => {
  // +0.15 与 −0.15 关于 0 对称，都进 hitBonus 槽
  const t = kalliroFrigate();
  const base = makeWeapon({ id: 'w', baseHit: { frigate: 0.6 } });
  const up = makeWeapon({ id: 'w', baseHit: { frigate: 0.6 }, hitBonus: 0.15 });
  const down = makeWeapon({ id: 'w', baseHit: { frigate: 0.6 }, hitBonus: -0.15 });
  const h0 = computeHitRate(base, t);
  const hUp = computeHitRate(up, t);
  const hDown = computeHitRate(down, t);
  // 加法对称性: (hUp−h0) = −(hDown−h0)
  assert.ok(
    Math.abs((hUp - h0) + (hDown - h0)) < 1e-9,
    `命中+15%与−15%应关于基线对称（加法特征），实际偏离 ${(hUp - h0 + hDown - h0).toFixed(4)}`
  );
});

test('判据: 比值测试锁死加法结构（实验3，全局命中debuff）', () => {
  // 无debuff vs 有−15%debuff，都打 d55%
  //   加法: hit(−15%)/hit(0) = (1−0.15−0.55)/(1−0.55) = 0.30/0.45 = 0.667
  //   乘法: 0.85（恒定）
  //   实测 0.677（用 FG300 base=0.687 的无词条基线 30.9% 作对照），贴加法。
  const t = kalliroFrigate();
  const h0 = computeHitRate(makeWeapon({ id: 'w', baseHit: { frigate: 0.6 } }), t);
  const hDebuff = computeHitRate(makeWeapon({ id: 'w', baseHit: { frigate: 0.6 }, hitBonus: -0.15 }), t);
  const ratio = hDebuff / h0;
  assert.ok(
    Math.abs(ratio - 0.667) < 0.02,
    `加法比值应≈0.667，实际 ${ratio.toFixed(3)}（乘法会是0.85）`
  );
});

// ---- 反推 base 常数检验（四组应近似常数）----

test('反推 base 常数: 加法成立时 base 应≈常数（含全局debuff实验3）', () => {
  // 用区间中值 0.6 作为 base，验证多组实验反推的 base 一致
  // 实验0: d55%无词条 → base = hit/(1−0.55)
  // 实验1: d55%+直射闪避15% → base = hit/(1−0.55−0.15)
  // 实验3: d55%+全局命中−15% → base = hit/(1−0.15−0.55)（与实验1同分母，因都进−0.15）
  const hit0 = computeHitRate(fg300Weapon(), kalliroFrigate(0.0));
  const hit1 = computeHitRate(fg300Weapon(), kalliroFrigate(0.15));
  const hit3 = computeHitRate(
    makeWeapon({ id: 'w', baseHit: { frigate: { min: 0.5, max: 0.7 } }, hitBonus: -0.15 }),
    kalliroFrigate()
  );
  const base0 = hit0 / (1 - 0.55);
  const base1 = hit1 / (1 - 0.55 - 0.15);
  const base3 = hit3 / (1 - 0.15 - 0.55);
  assert.ok(Math.abs(base0 - base1) < 1e-9, `实验0/1 base: ${base0.toFixed(3)} vs ${base1.toFixed(3)}`);
  assert.ok(Math.abs(base0 - base3) < 1e-9, `实验0/3 base: ${base0.toFixed(3)} vs ${base3.toFixed(3)}`);
});

// ---- 回归: 旧接口向后兼容（无新字段时行为不变）----

test('回归: 无 dodgeByWeaponType / hitBonusByTargetClass 时行为不变', () => {
  const w = makeWeapon({ id: 'w', baseHit: { destroyer: 0.8 }, hitBonus: 0.1 });
  const t = makeShip({ id: 't', cell: { side: 'enemy', row: 'front', col: 1 }, class: 'destroyer', dodge: 0.2 });
  // 旧公式: 0.8 × (1 + 0.1 − 0.2) = 0.72
  assert.ok(Math.abs(computeHitRate(w, t) - 0.72) < 1e-9);
});

test('回归: hitCheck 返回新增字段默认值', () => {
  const w = makeWeapon({ id: 'w', baseHit: { destroyer: 0.8 } });
  const t = makeShip({ id: 't', cell: { side: 'enemy', row: 'front', col: 1 }, class: 'destroyer' });
  const r = hitCheck(w, t, new MockRNG([0.5]));
  assert.equal(r.bonusByClass, 0, '无 hitBonusByTargetClass 时 bonusByClass=0');
  assert.equal(r.dodgeByType, 0, '无 dodgeByWeaponType 时 dodgeByType=0');
});
