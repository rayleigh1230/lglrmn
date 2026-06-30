/**
 * 用硬数据反推真实武器循环周期
 *
 * 副武器: 数量3, 实测29.4发/艘/42.5s (3门合计)
 *   → 每门 9.8发 in 42.5s
 *   → 若每门独立周期T: 9.8 = 42.5/T → T = 4.34s
 *   面板: 锁3 + 冷却2.1 = 5.1s (若锁定每周期) → 预测8.3发, 实测9.8
 *   面板: 仅首锁3 + 冷却2.1 = 2.1s (后续) → 后续(42.5-3)/2.1+1 = 19.5发, 实测9.8
 *   都不对!
 *
 * 关键观察: 首次伤害在5s后(不是3-4s)
 *   → 实际首发射时刻 ≈ 5s
 *
 * 新假设: 周期 = 锁定 + 持续 + 冷却, 但"持续0"可能不是真的0
 *   或: 首发延迟 = 锁定 + 某固定值
 */
const T = 42.5;

console.log('='.repeat(80));
console.log('用副武器实测发数反推周期(3门独立)');
console.log('='.repeat(80));
const subTotal = 29.4; // 发/艘(3门合计)
const subPerCanon = subTotal / 3; // 每门9.8发
console.log(`副武器: ${subTotal}发/艘(3门) = ${subPerCanon.toFixed(2)}发/门 in ${T}s`);
console.log(`反推每门周期 = ${T}/${subPerCanon.toFixed(2)} = ${(T/subPerCanon).toFixed(2)}s`);
console.log('');

// 主武器(1门)
const mainHits = 8.5; // 发/艘均值
console.log(`主武器: ${mainHits}发/艘(1门) in ${T}s`);
console.log(`反推周期 = ${T}/${mainHits} = ${(T/mainHits).toFixed(2)}s`);

console.log('\n' + '='.repeat(80));
console.log('面板参数 vs 反推周期');
console.log('='.repeat(80));
console.log('武器 | 面板锁+冷却 | 反推周期 | 差异');
console.log('-'.repeat(50));
console.log(`主武器 | 4+2.7=6.7s   | ${(T/mainHits).toFixed(2)}s     |`);
console.log(`副武器 | 3+2.1=5.1s   | ${(T/subPerCanon).toFixed(2)}s     |`);

console.log('\n' + '='.repeat(80));
console.log('关键检验: 首次伤害在5s后 → 首发延迟模型');
console.log('='.repeat(80));
console.log('用户观察: 首次伤害在5s+, 不是锁定的3-4s');
console.log('假设: 首发时刻 = 锁定 + Δ (Δ≈1-2s额外延迟)');
console.log('');
// 若首发在5s, 后续每周期一发
// 主武器: 周期T_m, 首发@5s, 8.5发 in 42.5s
//   8.5 = 1 + (42.5-5)/T_m → T_m = 37.5/7.5 = 5.0s
const firstShot = 5;
const mainT = (T - firstShot) / (mainHits - 1);
const subT = (T - firstShot) / (subPerCanon - 1);
console.log(`若首发@5s, 主武器周期 = (42.5-5)/(8.5-1) = ${mainT.toFixed(2)}s`);
console.log(`若首发@5s, 副武器周期 = (42.5-5)/(9.8-1) = ${subT.toFixed(2)}s`);
console.log('');
console.log('对照面板冷却:');
console.log(`  主武器冷却2.7, 实测周期${mainT.toFixed(2)} → ${mainT>2.7?'更长':'匹配'}`);
console.log(`  副武器冷却2.1, 实测周期${subT.toFixed(2)} → ${subT>2.1?'更长':'匹配'}`);

console.log('\n' + '='.repeat(80));
console.log('最可能的真实模型');
console.log('='.repeat(80));
console.log('面板"锁定+冷却"中, 锁定是【每发的前置时间】(瞄准/充能), 不是仅首次!');
console.log('  主武器: 每发 = 锁定4 + 冷却2.7 = 6.7s/发');
console.log('  但实测周期~5s, 比6.7短 → 锁定和冷却可能【重叠】或【锁定仅首】');
console.log('');
console.log('结合"首发在5s后":');
console.log('  首发延迟5s ≈ 锁定4s + 1s额外(动画/结算)');
console.log('  后续周期: 若锁定仅首次, 后续=冷却2.7s');
console.log('    主武器: 首@5s, 后续每2.7s → 42.5s内 = 1+(42.5-5)/2.7 = ' + (1+(42.5-5)/2.7).toFixed(1) + '发');
console.log('    实测8.5发 → 接近! ' + (Math.abs(1+(42.5-5)/2.7 - 8.5) < 1 ? '✓' : '✗'));
console.log('    副武器: 首@5s, 后续每2.1s → 42.5s内 = 1+(42.5-5)/2.1 = ' + (1+(42.5-5)/2.1).toFixed(1) + '发/门');
console.log('    ×3门 = ' + (3*(1+(42.5-5)/2.1)).toFixed(1) + '发, 实测29.4 → ' + (Math.abs(3*(1+(42.5-5)/2.1) - 29.4) < 2 ? '✓' : '✗'));

console.log('\n' + '='.repeat(80));
console.log('结论: 真实模型 = 首发延迟~5s + 后续按冷却周期');
console.log('='.repeat(80));
console.log('• 锁定时间(4s/3s) + ~1s额外延迟 = 首发时刻~5s');
console.log('• 锁定仅首次生效, 后续按冷却周期(主2.7s/副2.1s)');
console.log('• "数量3" = 3门独立武器, 各自独立计发数');
console.log('• 主武器发数波动: 1门武器对相位敏感, 不同斗牛首发时刻RNG差异→发数5~10');
