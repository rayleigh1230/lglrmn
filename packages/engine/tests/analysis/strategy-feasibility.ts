/**
 * 策略类词条测试【可行性/设计】分析
 *
 * 目的: 在动手测之前, 先算清楚两类策略词条"能测出什么、测不出什么",
 *       给出可执行的测试方案与目标数值。
 *
 * 背景公式(前三轮已证):
 *   final = base × (1 + bonus + 【+槽】 − 【−槽】), 夹 [10%, 95%]
 *   base 锚定 ≈ 0.687, 卡利莱恩 dodge=0.55
 *
 * 用法：npx tsx tests/strategy-feasibility.ts
 */
const BASE = 0.687;
const FLOOR = 0.10;
const ceil = 0.95;
const add = (d: number, k = 0) => Math.min(Math.max(BASE * (1 - d - k), FLOOR), ceil);
const mulFinal = (d: number, k = 0) => Math.min(Math.max(BASE * (1 - d) * (1 - k), FLOOR), ceil);

console.log('='.repeat(88));
console.log('一、时效性闪避的【饱和陷阱】: 90%/40% 撞底 → 公式不可辨');
console.log('='.repeat(88));
console.log('场景                  | 加法(进−槽) | 乘法(作用final) | 是否撞底 | 能否辨公式');
console.log('-'.repeat(88));
const cases = [
  ['卡利莱恩 d55% + 闪避90%', 0.55, 0.90],
  ['卡利莱恩 d55% + 闪避40%', 0.55, 0.40],
  ['低闪避船 d8%  + 闪避40%', 0.08, 0.40],
  ['低闪避船 d8%  + 闪避90%', 0.08, 0.90],
  ['卡利莱恩 d55% + 小闪避15%', 0.55, 0.15],
];
for (const [name, d, k] of cases) {
  const a = add(d, k), m = mulFinal(d, k);
  const floored = a <= FLOOR + 1e-9 && m <= FLOOR + 1e-9;
  const dist = Math.abs(a - m);
  console.log(`${name.padEnd(24)} |   ${(a * 100).toFixed(1)}%    |    ${(m * 100).toFixed(1)}%      |  ${floored ? '是' : '否 '}   |  ${dist < 0.01 ? '✗ 不可辨' : '✓ 可辨(差' + (dist * 100).toFixed(1) + 'pp)'}`);
}
console.log('\n→ 90% 闪避在任何船上都撞 10% 下限, 加法/乘法都预言 10%, 根本分不出公式。');
console.log('→ 40% 闪避配高闪避(55%)也撞底。只有【低闪避船 + 中等闪避buff】才离开下限、可辨公式。');

console.log('\n' + '='.repeat(88));
console.log('二、时效性 buff 的【时间窗模型】: 平均法失效, 必须按时段积分');
console.log('='.repeat(88));
// 例: 每75s 闪避+k 持续20s, 攻击方打 d=0.55 的卡利莱恩
function blended(d: number, k: number, period: number, dur: number, model: 'add' | 'mul') {
  const normal = model === 'add' ? add(d, 0) : mulFinal(d, 0);
  const buffed = model === 'add' ? add(d, k) : mulFinal(d, k);
  return (normal * (period - dur) + buffed * dur) / period;
}
console.log('\n例: 每75s 闪避+90% 持续20s, 打卡利莱恩(d55%)');
console.log('  正常窗(55s)命中率 ≈ ' + (add(0.55) * 100).toFixed(1) + '%');
console.log('  buff窗(20s)命中率  ≈ ' + (add(0.55, 0.9) * 100).toFixed(1) + '%  (撞底)');
const b_add = blended(0.55, 0.90, 75, 20, 'add');
const b_mul = blended(0.55, 0.90, 75, 20, 'mul');
console.log('  时间加权平均: 加法=' + (b_add * 100).toFixed(1) + '%, 乘法=' + (b_mul * 100).toFixed(1) + '%  → 完全相同, 测不出公式');
console.log('  (但能测【占空比 20/75】与【buff窗撞底】这两个时序事实)');

console.log('\n例: 每75s 闪避+15% 持续20s, 打【低闪避船 d8%】  ← 推荐配置');
console.log('  正常窗命中率 ≈ ' + (add(0.08) * 100).toFixed(1) + '%');
console.log('  buff窗 加法  ≈ ' + (add(0.08, 0.15) * 100).toFixed(1) + '%, 乘法 ≈ ' + (mulFinal(0.08, 0.15) * 100).toFixed(1) + '%  (差' + (Math.abs(add(0.08, 0.15) - mulFinal(0.08, 0.15)) * 100).toFixed(1) + 'pp, 离底, 可辨)');

console.log('\n' + '='.repeat(88));
console.log('三、全局固定类: "命中下降15%" 与 "冷却-40%"');
console.log('='.repeat(88));
console.log('• "命中下降15%": 若是【自身武器】降命中 → 进 +槽 为 −0.15 (对称于已证结论, 一测即证)。');
console.log('  预测: 卡利莱恩(d55%)被打, 攻击方带 −15%命中 → 命中率 ' + (add(0.55) * 100).toFixed(1) + '% → ' + (BASE * (1 + (-0.15) - 0.55) * 100).toFixed(1) + '% (加法, 不撞底, 可辨)。');
console.log('• "冷却时间-40%": 这是【射速/开火循环】机制, 不进命中公式, 单独测(影响的是每秒发数)。');
