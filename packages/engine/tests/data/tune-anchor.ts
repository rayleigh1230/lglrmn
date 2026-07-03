/**
 * 调校系统锚点校验
 *
 * 验证 resolveTuneSystem 能正确解析斗牛级(40501)的调校槽。
 * 运行：cd packages/engine && npx tsx tests/data/tune-anchor.ts
 *
 * 锚点（frida dump 自游戏运行时，2026-07-03）：
 *   斗牛40501 optIdx=38: ADJUST_ENHANCE_INDEX=8, ADJUST_PROB=10级, PREFIX=192010(优势输出 EID=13005)
 *   斗牛40501 optIdx=40: ADJUST_ENHANCE_INDEX=10, PREFIX=191230(精密射击 EID=12014)
 *   斗牛40501 optIdx=31: ADJUST_ENHANCE_INDEX=1, PREFIX=111211(龙骨结构 EID=10)
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadClientDataFromDir } from './nodeUtils.js';
import { resolveTuneSystem, TUNE_MAX_LEVEL, isTuneSlot } from '../../src/data/tuneSystem.js';

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

console.log('=== 调校系统锚点校验 ===\n');

const store = loadClientDataFromDir(CONFIG_DIR);

// 斗牛级 40501
console.log('[斗牛 / 40501]');
const tune = resolveTuneSystem(store, '40501');
console.log(`  调校槽数量: ${tune.tuneSlots.length}`);
for (const slot of tune.tuneSlots) {
  console.log(`  ${slot.enhanceId}(opt${slot.optIdx}): target=${slot.targetOptIdx} PREFIX=${slot.effectPrefix} ` +
    `prob=${slot.adjustProb.length}级 rarity=${slot.rarity} effect=${slot.effect?.name}(EID=${slot.effect?.effectId})`);
}

// 斗牛应该有多个调校槽
assert(tune.tuneSlots.length >= 3, `斗牛至少3个调校槽 (实际${tune.tuneSlots.length})`);

// 验证 ADJUST_PROB 都是10级
const allTenLevels = tune.tuneSlots.every(s => s.adjustProb.length === TUNE_MAX_LEVEL);
assert(allTenLevels, `所有调校槽都是${TUNE_MAX_LEVEL}级`);

// 验证 optIdx=38 的调校槽(优势输出)
const slot38 = tune.tuneSlots.find(s => s.optIdx === 38);
assert(!!slot38, '存在 optIdx=38 调校槽');
assert(slot38?.effect?.effectId === 13005, `opt38效果EID=13005(优势输出) 实际=${slot38?.effect?.effectId}`);

// 验证 optIdx=31 的调校槽(龙骨结构)
const slot31 = tune.tuneSlots.find(s => s.optIdx === 31);
assert(!!slot31, '存在 optIdx=31 调校槽');
assert(slot31?.effect?.effectId === 10, `opt31效果EID=10(龙骨结构) 实际=${slot31?.effect?.effectId}`);

// isTuneSlot 工具函数
assert(isTuneSlot('405010138') === true, 'isTuneSlot(405010138)=true');
assert(isTuneSlot('405010101') === false, 'isTuneSlot(405010101)=false(普通强化)');

console.log('\n=== 校验完成 ===');
if (process.exitCode) {
  console.error('有失败的校验！');
} else {
  console.log('✓ 全部通过');
}
