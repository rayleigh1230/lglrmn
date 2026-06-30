/**
 * 验证假设: 单舰模型吻合, 多舰出现偏差 → 多舰批次不同步?
 *
 * 回顾所有已测场景的"模型 vs 实测"吻合度:
 *
 * 单舰场景(模型吻合):
 *   实验0: FG300打各靶 → 反推base一致✓
 *   实验1: 卡利莱恩+直射闪避 → 整除性完美✓
 *   实验2: FG300对舰种命中 → 比值1.23贴加法✓
 *   实验3: 阋神星武器2命中debuff → 反推base=0.698✓
 *   共同点: 1艘攻击方, 发数模型精确
 *
 * 多舰场景(出现偏差):
 *   临时buff测试: 10艘斗牛集火
 *     - 模拟时长61.8s vs 实测74.5s (偏短13s)
 *     - 主武器发数5~10发, 差2倍
 *     - 各艘发射先后不同
 *     - 反推周期互相矛盾(2.7/5.0/6.7都对不上)
 */
console.log('='.repeat(80));
console.log('单舰 vs 多舰 模型吻合度对比');
console.log('='.repeat(80));
console.log('');
console.log('场景              | 攻击方 | 模型吻合? | 发数稳定? | 偏差来源');
console.log('-'.repeat(80));
const rows = [
  ['实验0 FG300通用闪避', '1艘', '✓吻合', '✓稳定', '无'],
  ['实验1 直射闪避', '1艘', '✓吻合', '✓稳定', '无'],
  ['实验2 对舰种命中', '1艘', '✓吻合', '✓稳定', '无'],
  ['实验3 命中debuff', '1艘', '✓吻合', '✓稳定', '无'],
  ['临时buff测试', '10艘', '✗偏短13s', '✗5~10发', '多舰不同步?'],
];
for (const r of rows) console.log(`${r[0].padEnd(20)}| ${r[1].padStart(4)} | ${r[2].padEnd(8)} | ${r[3].padEnd(9)} | ${r[4]}`);

console.log('\n' + '='.repeat(80));
console.log('假设: 多舰模式有【批次不同步】机制');
console.log('='.repeat(80));
console.log('可能机制A: 开火相位错开(避免齐射卡顿/平衡DPS)');
console.log('  10艘斗牛的首次锁定/开火时刻错开N秒');
console.log('  → 各艘在固定时长内开火次数不同 → 发数波动');
console.log('');
console.log('可能机制B: 目标轮换/分配不同步');
console.log('  多个攻击方对多目标时, 目标选择有时序');
console.log('  但本例只有1个目标, 不适用');
console.log('');
console.log('可能机制C: 全局开火节流(服务器tick/批次处理)');
console.log('  同一tick内只处理有限开火事件, 多出的推到下一tick');
console.log('  → 高密度开火被"排队" → 实际间隔拉长');

console.log('\n' + '='.repeat(80));
console.log('用"批次不同步"假设重新解读10艘数据');
console.log('='.repeat(80));
const ships = [
  { id: 1, main: 10 }, { id: 2, main: 10 }, { id: 3, main: 5 },
  { id: 4, main: 7 }, { id: 5, main: 9 }, { id: 6, main: 10 },
  { id: 7, main: 7 }, { id: 8, main: 10 }, { id: 9, main: 9 }, { id: 10, main: 8 },
];
console.log('主武器命中发数(已锁定perHit=514):');
console.log(ships.map(s => s.id + ':' + s.main + '发').join('  '));
console.log('');
console.log('若真实周期=5s/发(反推), 42.5s应打8.5发');
console.log('发数5~10 → 相当于有效开火时长25~50s');
console.log('  即各艘的【首发时刻】从 t=-7s 到 t=20s 错开?');
console.log('  或各艘【末发时刻】不同(部分早停?)');
console.log('');
// 若所有斗牛同时开始, 同时结束, 发数应相同
// 发数不同 → 开火相位必然不同
console.log('结论: 发数5~10且无阵亡 → 【开火相位必然错开】');
console.log('  艘3(5发): 相位最靠后, 实际开火窗口最短');
console.log('  艘1/2/6/8(10发): 相位最靠前, 开火窗口最长');

console.log('\n' + '='.repeat(80));
console.log('这对引擎的影响');
console.log('='.repeat(80));
console.log('若多舰有批次不同步, 那么:');
console.log('  • 单舰命中公式(加法/乘法)仍然正确(单舰数据吻合)');
console.log('  • 多舰总DPS不能用"N×单舰DPS"简单计算');
console.log('  • 需要建模【相位错开】或【开火排队】');
console.log('');
console.log('但这不影响加法/乘法判定:');
console.log('  • 加法/乘法是【命中率】问题, 与开火相位无关');
console.log('  • 单舰场景已验证公式(实验0-3)');
console.log('  • 多舰的时长偏差是【发数调度】问题, 不是命中公式问题');
