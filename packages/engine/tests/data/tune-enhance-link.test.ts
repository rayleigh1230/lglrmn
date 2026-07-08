/**
 * 调校与强化联动测试 —— 对齐客户端 SYSTEM_ADJUST_IN_ENHANCE 路由
 *
 * 验证：
 * 1. 子系统 scope 解析：调校槽的 targetEnhanceId = shipId+slot+pad2(ADJUST_ENHANCE_INDEX)（同 slot）
 * 2. 前提门控：调校生效需目标强化项（父强化）已点等级
 * 3. ★属性产出走父强化 EFFECT_ID 通道（调校自身 EID 如 13005 是技能触发器，不产出属性）：
 *    - 结构调校 605011231 → 父 EID=10（龙骨结构增强II），按 PARAM_LEVEL 查表
 *    - 技能调校 605010140 → 自身 EID=13005（仅 UI 显示），父 EID=12141（duration ratio_del）
 *
 * 锚点（60501，10个调校槽）：
 *   605011231 slot12 opt31 target=605011201 父EID=10 龙骨结构增强II（结构类，PARAM_LEVEL lv5=1400）
 *   605010140 slot01 opt40 target=605010110 自身EID=13005(显示用)/父EID=12141 快速输出（duration类）
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
  // ★调校自身 effect（UI 显示用）：EID=10，PARAM=1500（无 PARAM_LEVEL）
  assert(structSlot?.effect?.effectId === 10, `605011231 自身 effect EID=10 结构`);
  assert(structSlot?.effect?.name === '龙骨结构增强II', `605011231 name=龙骨结构增强II (实际${structSlot?.effect?.name})`);
  // ★父强化 effect（属性产出通道）：EID=10，有 PARAM_LEVEL 等级表（lv5=1400）
  assert(structSlot?.parentEffect?.effectId === 10, `605011231 父 EID=10 结构`);
  assert(structSlot?.parentEffect?.paramLevel?.includes('5,1400'), `605011231 父 PARAM_LEVEL 含 lv5=1400 (实际${structSlot?.parentEffect?.paramLevel})`);

  // 605010140 → target=605010110（快速输出）
  //   调校自身 EID=13005（技能频率，技能触发器，仅 UI 显示，不在 weapon_num_attr）
  //   父 EID=12141（缩短冷却与打击时间，duration ratio_del）
  const skillSlot = tune.tuneSlots.find(s => s.enhanceId === '605010140');
  assert(skillSlot?.targetEnhanceId === '605010110', `605010140 target=605010110 (实际${skillSlot?.targetEnhanceId})`);
  assert(skillSlot?.effect?.effectId === 13005, `605010140 自身 EID=13005（技能触发器，UI显示）`);
  assert(skillSlot?.parentEffect?.effectId === 12141, `605010140 父 EID=12141（duration ratio_del）`);
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

// ===== 测试5: ★父 EFFECT_ID 路由（结构走父 EID=10；技能类走父 EID=12141 duration）=====
console.log('\n[测试5] 父 EFFECT_ID 路由（对齐 SYSTEM_ADJUST_IN_ENHANCE）');
{
  // 605011231(结构, 父EID=10) + 605010140(快速输出, 自身EID=13005 技能触发器, 父EID=12141 duration)
  const tuneLevels = { '605011231': 5, '605010140': 3 };
  const enhanceLevels = { '605011201': 1, '605010110': 1 };
  const bonus = computeTuneBonus(store, '60501', tuneLevels, enhanceLevels);
  // 结构调校：父 PARAM_LEVEL lv5=1400 → structureBonusPermille=1400
  assert(bonus.structureBonusPermille === 1400, `结构加成=1400 (父PARAM_LEVEL lv5) (实际${bonus.structureBonusPermille})`);
  // 技能调校：父EID=12141 是 duration ratio_del，不是伤害 → damageBonusPermille=0（正确，13005 自身不产出伤害）
  assert(bonus.damageBonusPermille === 0, `技能调校不产出伤害加成=0 (实际${bonus.damageBonusPermille})`);
  assert(bonus.details.length === 2, `details 2条 (实际${bonus.details.length})`);
  // ★两条 effectList 都用父 EID（10 和 12141），不是调校自身 EID
  const eids = bonus.effectList.map(e => e.effectId).sort((a,b)=>a-b);
  assert(eids.includes(10) && eids.includes(12141), `effectList 含父 EID 10 和 12141 (实际${eids})`);
  // 12141 在 weapon_num_attr 是 duration ratio_del → 进 effectList 后能被 effectList.ts 正确消费
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
