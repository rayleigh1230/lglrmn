/**
 * 调校与强化联动测试
 *
 * 验证两点：
 * 1. 子系统 scope 解析：调校槽的 targetEnhanceId = shipId+slot+pad2(ADJUST_ENHANCE_INDEX)（同 slot）
 * 2. 前提门控：调校生效需目标强化项已点等级（enhanceLevels）
 * 3. 效果聚合：调校独立效果按 EFFECT_ID 分发（EID=10结构/13005伤害 等）
 *
 * 锚点（60501，10个调校槽）：
 *   605011231 slot12 opt31 target=605011201 EID=10 龙骨结构增强II（结构类）
 *   605010140 slot01 opt40 target=605010110 EID=13005 快速输出（伤害类）
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadClientDataFromDir } from './nodeUtils.js';
import { resolveTuneSystem, computeTuneBonus, TUNE_MAX_LEVEL } from '../../src/data/tuneSystem.js';
import { resolveBlueprint } from '../../src/data/blueprintResolver.js';
import type { ClientDataStore } from '../../src/data/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = join(__dirname, '..', '..', '..', '..', 'data', 'client', 'config');

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`  ✗ FAIL: ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`  ✓ PASS: ${msg}`);
  }
}

const store: ClientDataStore = loadClientDataFromDir(CONFIG_DIR);

console.log('=== 调校与强化联动测试 ===\n');

// ===== 测试1: 60501 调校槽子系统 scope 解析（targetEnhanceId 同 slot）=====
console.log('[测试1] 60501 调校槽 targetEnhanceId 子系统 scope');
{
  const tune = resolveTuneSystem(store, '60501');
  assert(tune.tuneSlots.length === 10, `60501 有10个调校槽 (实际${tune.tuneSlots.length})`);

  // 验证每个调校槽的 targetEnhanceId = shipId + 同slot + pad2(targetOptIdx)
  for (const slot of tune.tuneSlots) {
    const expected = '60501' + slot.enhanceId.slice(5, 7) + String(slot.targetOptIdx).padStart(2, '0');
    assert(slot.targetEnhanceId === expected, `${slot.enhanceId} targetEnhanceId=${expected} (实际${slot.targetEnhanceId})`);
  }

  // 特定锚点：605011231 → target=605011201（龙骨结构增强II）
  const structSlot = tune.tuneSlots.find(s => s.enhanceId === '605011231');
  assert(structSlot?.targetEnhanceId === '605011201', `605011231 target=605011201 (实际${structSlot?.targetEnhanceId})`);
  assert(structSlot?.effect?.effectId === 10, `605011231 effect EID=10 结构`);
  assert(structSlot?.effect?.name === '龙骨结构增强II', `605011231 name=龙骨结构增强II (实际${structSlot?.effect?.name})`);

  // 605010140 → target=605010110（快速输出，伤害）
  const dmgSlot = tune.tuneSlots.find(s => s.enhanceId === '605010140');
  assert(dmgSlot?.targetEnhanceId === '605010110', `605010140 target=605010110 (实际${dmgSlot?.targetEnhanceId})`);
  assert(dmgSlot?.effect?.effectId === 13005, `605010140 effect EID=13005 伤害`);
}

// ===== 测试2: 前提门控 —— 目标强化未点 → 调校不计入 =====
console.log('\n[测试2] 前提门控：目标强化未点 → skipped');
{
  // 605011231（龙骨结构增强II）level=5，但目标 605011201 未点
  const tuneLevels = { '605011231': 5 };
  const enhanceLevels = {}; // 目标 605011201 未点
  const bonus = computeTuneBonus(store, '60501', tuneLevels, enhanceLevels);
  assert(bonus.structureBonusPermille === 0, `门控生效：结构加成=0 (实际${bonus.structureBonusPermille})`);
  assert(bonus.skipped.length === 1, `skipped 1条 (实际${bonus.skipped.length})`);
  assert(bonus.skipped[0].enhanceId === '605011231', `skipped enhanceId=605011231`);
  assert(bonus.skipped[0].targetEnhanceId === '605011201', `skipped target=605011201`);
}

// ===== 测试3: 前提门控 —— 目标强化已点 → 调校计入 =====
console.log('\n[测试3] 前提门控：目标强化已点 → 计入');
{
  const tuneLevels = { '605011231': 5 };
  const enhanceLevels = { '605011201': 1 }; // 目标已点1级
  const bonus = computeTuneBonus(store, '60501', tuneLevels, enhanceLevels);
  assert(bonus.skipped.length === 0, `无 skipped (实际${bonus.skipped.length})`);
  assert(bonus.details.length === 1, `details 1条`);
  assert(bonus.structureBonusPermille > 0, `结构加成>0 (实际${bonus.structureBonusPermille})`);
}

// ===== 测试4: 不传 enhanceLevels → 不检查门控（向后兼容）=====
console.log('\n[测试4] 不传 enhanceLevels → 不检查门控');
{
  const tuneLevels = { '605011231': 5 };
  const bonus = computeTuneBonus(store, '60501', tuneLevels); // 无 enhanceLevels
  assert(bonus.skipped.length === 0, `无门控 skipped=0`);
  assert(bonus.structureBonusPermille > 0, `结构加成>0 (实际${bonus.structureBonusPermille})`);
}

// ===== 测试5: 多 EFFECT_ID 聚合（结构 EID=10 + 伤害 EID=13005）=====
console.log('\n[测试5] 多 EFFECT_ID 聚合');
{
  // 605011231(EID=10 结构) + 605010140(EID=13005 伤害)
  const tuneLevels = { '605011231': 5, '605010140': 3 };
  // 目标都点出来
  const enhanceLevels = { '605011201': 1, '605010110': 1 };
  const bonus = computeTuneBonus(store, '60501', tuneLevels, enhanceLevels);
  assert(bonus.structureBonusPermille > 0, `结构加成>0 (实际${bonus.structureBonusPermille})`);
  assert(bonus.damageBonusPermille > 0, `伤害加成>0 (实际${bonus.damageBonusPermille})`);
  assert(bonus.details.length === 2, `details 2条 (实际${bonus.details.length})`);
}

// ===== 测试6: resolveBlueprint 接入调校加成 =====
console.log('\n[测试6] resolveBlueprint 接入调校');
{
  const tuneLevels = { '605011231': 5 };
  const enhanceLevels = { '605011201': 1 };
  const bp = resolveBlueprint(store, '60501', '', { tuneLevels, enhanceLevels });
  // 调校结构加成应让 finalStructure 提升（结构万分比叠加到强化系数）
  const bpNoTune = resolveBlueprint(store, '60501', '', {});
  assert(bp.finalStructure >= bpNoTune.finalStructure, `含调校 finalStructure(${bp.finalStructure}) >= 无调校(${bpNoTune.finalStructure})`);
}

console.log('\n=== 测试完成 ===');
