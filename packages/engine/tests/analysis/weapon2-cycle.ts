/**
 * 武器2 攻击循环【参数敏感性】诊断
 *
 * 实测命中率系统性偏高(41.88% vs 预测最高27%) → 说明【发数算少了】。
 * 重新审视武器2循环参数, 尝试不同解读:
 *
 * 面板: 单发315 持续0 弹药2 次数1 冷却6.6 锁定4 数量1
 *
 * 解读歧义:
 *   - "弹药2" 是什么? 可能是"每发耗2弹药"(不影响循环), 或"每次开火打2发"
 *   - "次数1" 是"开火1次"还是"每周期1轮"
 *   - "持续0" → 瞬发, 单次开火
 *
 * 候选循环模型:
 *   M1(原): 锁4 + 1发 + 冷6.6 → 周期6.6s/发        (发数最少, 命中率最高)
 *   M2: 锁4 + 2发(弹药2) + 冷6.6 → 周期6.6s/2发      (发数翻倍)
 *   M3: 锁4 + 1发 + 冷6.6, 但冷却从【开火后】计 → 首发在t=4, 周期6.6
 *   M4: 无锁定(锁4是别的), 周期6.6 → 首发t=0
 *
 * 用法：npx tsx tests/weapon2-cycle.ts
 */

function mmss(s: string): number {
  const [m, sec] = s.split(':').map(Number);
  return m * 60 + sec;
}

const obs = [
  ['5:56', 6754],
  ['6:28', 6814],
  ['5:33', 7256],
];
const PER_HIT = 307;

// M1: 锁4, 每周期1发, 周期6.6
const M1 = (t: number) => { let n = 0, s = 4; while (s <= t + 1e-6) { n++; s += 6.6; } return n; };
// M2: 锁4, 每周期2发(弹药2), 周期6.6
const M2 = (t: number) => { let n = 0, s = 4; while (s <= t + 1e-6) { n += 2; s += 6.6; } return n; };
// M3: 锁4, 每周期1发, 但冷却只6.6中部分... (同M1, 跳过)
// M4: 无锁, 周期6.6, 首发t=0
const M4 = (t: number) => { let n = 0, s = 0; while (s <= t + 1e-6) { n++; s += 6.6; } return n; };
// M5: 锁4, 每周期1发, 周期=6.6+0(持续0) 但也许"持续0"意味着瞬间全弹打出, 弹药2→2发同时
//      → 同 M2
// M6: 冷却6.6是从【锁定后首次开火】到【下次可开火】, 但开火本身在周期末 → 同M1
// M7: 也许冷却实际更短? 面板6.6是缩短40%后(原始11), 没问题. 但若"次数1"=每弹药1发, 弹药2→2发/周期

console.log('='.repeat(88));
console.log('武器2 攻击循环参数敏感性诊断');
console.log('='.repeat(88));
console.log('目标: 找到能让【反推base≈0.60~0.70】且【整除性合理】的循环模型');
console.log('');
console.log('场次 | 时长 | 伤害 | M1(1发/6.6s) |   M2(2发/6.6s)   |   M4(无锁,1发/6.6s)');
console.log('      |      |      | 发数 命中率 base | 发数 命中率 base | 发数 命中率 base');
console.log('-'.repeat(88));

const DODGE = 0.55;
const K = 0.15;
for (const [ts, dmg] of obs) {
  const t = mmss(ts);
  const s1 = M1(t), s2 = M2(t), s4 = M4(t);
  const hits = dmg / PER_HIT;
  const r1 = hits / s1, r2 = hits / s2, r4 = hits / s4;
  // 反推base(假设加法A): base = rate / (1-0.15-0.55) = rate/0.30
  console.log(
    ` ${ts} | ${t}s | ${dmg} |  ${String(s1).padStart(3)}  ${(r1 * 100).toFixed(1)}%  ${(r1 / 0.30).toFixed(2)} |  ${String(s2).padStart(3)}  ${(r2 * 100).toFixed(1)}%  ${(r2 / 0.30).toFixed(2)}  |  ${String(s4).padStart(3)}  ${(r4 * 100).toFixed(1)}%  ${(r4 / 0.30).toFixed(2)}`
  );
}

console.log('\n' + '='.repeat(88));
console.log('期望: base 应≈0.60~0.70。找让 base 落在此区间的模型。');
console.log('='.repeat(88));

// 也试试: 如果"弹药2次数1"= 每周期开火1次但打2发(弹药2), 且持续0→瞬间2发
// 这就是M2。看M2的反推base。
console.log('\n各模型反推 base 均值(假设加法A):');
for (const [name, fn] of [['M1 1发/6.6s', M1], ['M2 2发/6.6s', M2], ['M4 无锁1发/6.6s', M4]] as [string, (t: number) => number][]) {
  const bases = obs.map(([ts, dmg]) => {
    const t = mmss(ts);
    return (dmg / PER_HIT) / fn(t) / 0.30;
  });
  const mean = bases.reduce((a, b) => a + b, 0) / bases.length;
  console.log(`  ${name}: base均值 = ${mean.toFixed(3)}  ${mean > 0.6 && mean < 0.7 ? '✓ 落在区间' : mean < 0.6 ? '(偏低)' : '(偏高)'}`);
}

// 关键检验: 如果没有−15%词条, 基线命中率 = base×0.45。
// 前序实验FG300 base≈0.687。若阋神星武器2的base类似, 无词条命中率应≈0.687×0.45=30.9%
// 实测41.88%(M1) 远高于此 → 要么base更高, 要么发数算少, 要么−15%根本没生效
console.log('\n' + '='.repeat(88));
console.log('关键参照: 若无−15%词条, 用FG300标定的base=0.687, 命中率应≈30.9%');
console.log('='.repeat(88));
console.log('实测(M1模型)=41.88% > 30.9% → 命中率比【无词条基线】还高!');
console.log('这不可能(词条是降命中)。说明【发数模型错了】或【伤害源不止武器2】。');
console.log('');
console.log('最可能: "弹药2"=每次开火打2发, 应用M2模型 → 发数翻倍, 命中率减半。');
