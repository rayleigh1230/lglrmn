/**
 * +0%命中档 实测数据分析
 *
 * 实测: 5场, 3场1:15(75s), 2场1:14(74s)
 *   → 明显的【双峰离散】, 不是连续分布
 *   → 用户观察: ~20秒进入60%血量区间(触发点)
 *
 * 预测(之前模型):
 *   加法T = 57s, 乘法T = 50s
 *
 * 实测74-75s 远大于预测57/50s → 系统性偏长
 * 原因分析:
 *   1. 首次锁定4s(我模型忽略) → +4s
 *   2. 但57→74差了17s, 不止4s
 *   3. 关键: "20秒进入60%区间"意味着前段(40%血)用了20s, 而我模型算的前段时间更短
 *
 * 重新核对前段时长:
 *   前段 = 40%HP / (DPS × f × hit_front)
 *   hit_front(加法,+0%k) = 0.85×(1−0.20)×w1F + 0.60×(1−0.20)×w2F
 */
const HP = 52223, TRIG = 0.60, DODGE_BASE = 0.20, BUFF_DODGE = 0.40, BUFF_DUR = 45, SHIELD = 0.03;
const w1Dps = 525 / 2.7, w2Dps = (28 / 2.1) * 3, total = w1Dps + w2Dps;
const w1F = w1Dps / total, w2F = w2Dps / total;
const nShips = 10;

console.log('='.repeat(80));
console.log('核对: 前段(40%血)应该用多久?');
console.log('='.repeat(80));
const dpsEff = total * nShips * (1 - SHIELD);
const hitFront_add = 0.85 * (1 - DODGE_BASE) * w1F + 0.60 * (1 - DODGE_BASE) * w2F;
console.log(`有效DPS = ${dpsEff.toFixed(1)}/s`);
console.log(`前段命中率(加法,+0%k) = ${(hitFront_add * 100).toFixed(1)}%`);
console.log(`前段应掉血 = ${dpsEff * hitFront_add} = ${(dpsEff * hitFront_add).toFixed(1)}/s`);
const hpFront = HP * (1 - TRIG);
const T1_model = hpFront / (dpsEff * hitFront_add);
console.log(`前段HP = ${hpFront}, 模型预测前段时长 = ${T1_model.toFixed(1)}s`);
console.log(`用户实测: ~20s进入60%区间`);
console.log(`→ 模型${T1_model.toFixed(1)}s vs 实测~20s, ${T1_model < 20 ? '模型偏快' : '模型偏慢'}`);

console.log('\n' + '='.repeat(80));
console.log('可能的解释: 首次锁定 + 渐入效应');
console.log('='.repeat(80));
console.log('• 10艘首发锁定4s, 这4s内0伤害');
console.log('• 但4s只解释一部分, 57→74差17s');
console.log('• 另一个可能: 斗牛武器2(3门)锁定3s, 但武器1(主火力)锁定4s');
console.log('• 还有: 战斗开始时目标满血, 前40%血掉得快, 但锁定期内无输出');

// 反推: 如果前段实际20s, 后段54s(74-20), 后段是什么命中率?
console.log('\n' + '='.repeat(80));
console.log('反推: 用实测时长反推后段(buff窗)命中率');
console.log('='.repeat(80));
const T_total_obs = 74.5; // 5场均值
const T_front_obs = 20;   // 用户观察
const T_back_obs = T_total_obs - T_front_obs; // 后段
console.log(`实测: 前段${T_front_obs}s + 后段${T_back_obs}s = ${T_total_obs}s`);
console.log(`后段掉血 = ${HP * TRIG} = ${HP * TRIG}HP`);
const hitBack_implied = (HP * TRIG) / (dpsEff * T_back_obs);
console.log(`反推后段命中率 = ${hitBack_implied.toFixed(3)} = ${(hitBack_implied * 100).toFixed(1)}%`);

console.log('\n两个假设预测的后段命中率:');
const hitBack_add = 0.85 * (1 - DODGE_BASE - BUFF_DODGE) * w1F + 0.60 * (1 - DODGE_BASE - BUFF_DODGE) * w2F;
const hitBack_mul = (0.85 * (1 - DODGE_BASE) * (1 - BUFF_DODGE)) * w1F + (0.60 * (1 - DODGE_BASE) * (1 - BUFF_DODGE)) * w2F;
console.log(`  加法(进−槽): ${(hitBack_add * 100).toFixed(1)}%`);
console.log(`  乘法:        ${(hitBack_mul * 100).toFixed(1)}%`);
console.log(`  实测反推:    ${(hitBack_implied * 100).toFixed(1)}%`);
console.log(`  → ${Math.abs(hitBack_implied - hitBack_add) < Math.abs(hitBack_implied - hitBack_mul) ? '✓ 贴加法' : '✓ 贴乘法'}`);

console.log('\n' + '='.repeat(80));
console.log('双峰离散(74/75)的解释');
console.log('='.repeat(80));
console.log('5场: 3场75s, 2场74s');
console.log('• 1秒差异 = 后段最后几发的RNG(血量何时归零)');
console.log('• 触发时刻(20s±)的微小波动导致总时长±1s');
console.log('• 这是正常的统计散布, 不是双峰机制');
