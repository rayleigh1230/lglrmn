/**
 * 量化两个独立效应对"模拟偏高"的贡献
 *
 * 实测 vs 模拟(加法):
 *   +0%档:  实测74.5s vs 模拟61.8s  → 偏高, 差12.7s
 *   +30%档: 实测52.0s vs 模拟40.7s  → 偏高, 差11.3s
 *
 * 效应1: 95%上限(区间上沿被夹)
 *   仅影响+30%档武器1前段(0.85→1.0 roll时夹95%)
 *   +0%档武器1前段最高0.80(0.85×(1−0.20)区间roll到1.0)= 0.80, 不夹
 *   → 效应1只影响+30%档, 不影响+0%档
 *
 * 效应2: perHit额外减伤(实测反推f=0.834, 模型用0.97)
 *   影响两档所有武器
 *   → 这是两档都偏高的主因
 *
 * 关键判别: +0%档也偏高12.7s, 但+0%档不触发95%上限
 *   → 说明【95%上限不是主因】, perHit减伤才是
 */
const TARGET_HP = 52223;
const SHIELD = 0.03;
const F_MODEL = 0.97;   // 模型用的减伤系数
const F_REAL = 0.834;   // 实测反推的减伤系数

console.log('='.repeat(80));
console.log('效应1: 95%上限对+30%档武器1前段的影响');
console.log('='.repeat(80));
// 武器1区间70-100%, +30%命中, 闪避20%, 前段
// 无上限: hit = base × (1.30 − 0.20) = base × 1.10
//   base∈[0.70,1.00] → hit∈[0.77, 1.10]
//   平均(中值0.85): 0.85×1.10 = 0.935
// 有上限: hit > 0.95 夹到0.95
//   base使hit>0.95的临界: base > 0.95/1.10 = 0.864
//   即base∈(0.864, 1.00]被夹, 占区间(1.00−0.864)/(1.00−0.70) = 45%的roll被夹
const baseMin = 0.70, baseMax = 1.00;
const critBase = 0.95 / 1.10;
const clippedFrac = (baseMax - critBase) / (baseMax - baseMin);
// 平均命中率(有上限): 积分
// base∈[0.70,0.864]: hit=base×1.10, 均值=(0.70+0.864)/2×1.10
// base∈[0.864,1.00]: hit=0.95
const avgNoClip = (baseMin + baseMax) / 2 * 1.10;
const avgClipLow = (baseMin + critBase) / 2 * 1.10 * (1 - clippedFrac);
const avgClipHigh = 0.95 * clippedFrac;
const avgWithClip = avgClipLow + avgClipHigh;
console.log(`武器1前段(+30%k): 无上限均值 = ${(avgNoClip * 100).toFixed(1)}%`);
console.log(`                  有上限均值 = ${(avgWithClip * 100).toFixed(1)}%`);
console.log(`                  95%上限降低命中率 ${(avgNoClip - avgWithClip).toFixed(3)} = ${((avgNoClip - avgWithClip) * 100).toFixed(1)}pp`);
console.log(`                  → 这会让+30%档【变慢】, 不是变快!`);

console.log('\n' + '='.repeat(80));
console.log('效应2: perHit减伤差异(主因)');
console.log('='.repeat(80));
console.log(`模型f=${F_MODEL} (护盾3%), 实测反推f=${F_REAL}`);
console.log(`模型perHit过高 → 模拟伤害过高 → 模拟时长过短`);
console.log(`修正系数 = ${F_REAL}/${F_MODEL} = ${(F_REAL/F_MODEL).toFixed(3)}`);
console.log(`模拟时长应乘以 ${(1/(F_REAL/F_MODEL)).toFixed(3)} 才能匹配实测`);
console.log(`  +0%档: 61.8s × ${(1/(F_REAL/F_MODEL)).toFixed(3)} = ${(61.8/(F_REAL/F_MODEL)).toFixed(1)}s (实测74.5s)`);
console.log(`  +30%档: 40.7s × ${(1/(F_REAL/F_MODEL)).toFixed(3)} = ${(40.7/(F_REAL/F_MODEL)).toFixed(1)}s (实测52.0s)`);

console.log('\n' + '='.repeat(80));
console.log('结论: 主因是perHit减伤, 不是95%上限');
console.log('='.repeat(80));
console.log('• 95%上限只影响+30%档武器1前段, 且是【让命中降低→变慢】, 方向相反');
console.log('• +0%档完全不触发95%上限, 但也偏高12.7s → 证明上限不是主因');
console.log('• perHit减伤(f=0.834 vs 模型0.97)同时影响两档, 是偏高的真凶');
console.log('');
console.log('待查: 目标船的额外14%减伤来自哪里?');
console.log('  护盾3% + 未知14% = 总17%减伤');
console.log('  可能: ①能量减伤策略 ②护盾是数值型非百分比 ③其他防御机制');
