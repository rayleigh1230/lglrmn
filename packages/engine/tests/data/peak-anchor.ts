/**
 * 巅峰等级锚点校验脚本
 *
 * 验证 peakLevel.ts 的巅峰聚合是否与实测锚点一致。
 * 运行：cd packages/engine && npx tsx tests/data/peak-anchor.ts
 *
 * 锚点（来自 cfg_ship_peak_level + cfg_system_effect 交叉验证）：
 *   ST59(60301) 巅峰16 = +52680 结构（龙骨 603010101 第16行）
 *   ST59(60301) 巅峰20 = +66905 结构（第20行）
 *   FG300(30101) 巅峰20 = +3245 结构
 *   斗牛(40501) 巅峰5 = +2745 结构（与旧经验估算一致）
 */
import { loadClientDataFromDir } from './nodeUtils.js';
import { computePeakBonus, getPeakSnapshot, getPeakLevelByExp } from '../../src/data/peakLevel.js';
import { resolveBlueprint } from '../../src/data/blueprintResolver.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CONFIG_DIR = join(__dirname, '..', '..', '..', '..', 'data', 'client', 'config');

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`  ✗ FAIL: ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`  ✓ PASS: ${msg}`);
  }
}

console.log('=== 巅峰等级锚点校验 ===\n');

const store = loadClientDataFromDir(CONFIG_DIR);

// 锚点1: ST59 巅峰16
console.log('[ST59 / 60301]');
let bonus = computePeakBonus(store, '60301', 16);
console.log('  巅峰16 加成:', bonus.details);
assert(bonus.structureAbsolute === 52680, `ST59巅峰16结构=52680 (实际${bonus.structureAbsolute})`);

// 锚点2: ST59 巅峰20
bonus = computePeakBonus(store, '60301', 20);
assert(bonus.structureAbsolute === 66905, `ST59巅峰20结构=66905 (实际${bonus.structureAbsolute})`);

// 锚点3: FG300 巅峰20
console.log('\n[FG300 / 30101]');
bonus = computePeakBonus(store, '30101', 20);
assert(bonus.structureAbsolute === 3245, `FG300巅峰20结构=3245 (实际${bonus.structureAbsolute})`);

// 锚点4: 斗牛 巅峰5
console.log('\n[斗牛 / 40501]');
bonus = computePeakBonus(store, '40501', 5);
assert(bonus.structureAbsolute === 2745, `斗牛巅峰5结构=2745 (实际${bonus.structureAbsolute})`);

// 锚点5: 斗牛 巅峰5 含移速(槽02/03)
const snapshot = getPeakSnapshot(store, '40501', 10);
console.log('  斗牛巅峰10 强化串解析:', snapshot.enhances);
assert(snapshot.enhances.length >= 2, '斗牛巅峰10至少2个槽(槽01+槽02/03)');

// 锚点6: 经验阈值判定
console.log('\n[经验阈值]');
const lv20 = getPeakLevelByExp(store, 130000);
const lv15 = getPeakLevelByExp(store, 81000);
const lv5 = getPeakLevelByExp(store, 21000);
console.log(`  经验130000 → 巅峰${lv20}, 经验81000 → 巅峰${lv15}, 经验21000 → 巅峰${lv5}`);
assert(lv20 === 19, `经验130000→巅峰19 (实际${lv20})`);
assert(lv15 === 15, `经验81000→巅峰15 (实际${lv15})`);
assert(lv5 === 5, `经验21000→巅峰5 (实际${lv5})`);

// 锚点7: resolver 完整集成（无科技串，纯巅峰）
console.log('\n[resolver 集成]');
const bp = resolveBlueprint(store, '40501', '', { peakLevel: 5 });
console.log(`  斗牛巅峰5: peakLevel=${bp.peakLevel} peakStructureBonus=${bp.peakStructureBonus}`);
assert(bp.peakLevel === 5, `resolver peakLevel=5`);
assert(bp.peakStructureBonus === 2745, `resolver peakStructureBonus=2745`);

console.log('\n=== 校验完成 ===');
if (process.exitCode) {
  console.error('有失败的校验！');
} else {
  console.log('✓ 全部通过');
}
