/**
 * 巅峰强化奖励测试（field[1] —— 巅峰专属强化项等级给定）
 *
 * ★ 机制（2026-07-04 铁证验证，斗牛40501为锚点）：
 * cfg_ship_peak_level[shipId+peakLv] 是2元素数组：
 *   field[0] = 普通强化项等级给定（slot01/02/03，已有 peakLevel.ts 处理）
 *   field[1] = "enhanceId,level;..." 巅峰专属强化项等级给定（optIdx=70/71）
 *
 * field[1] 解析链：
 *   enhanceId(9位) -> systemEnhance[enhanceId].SYSTEM_EFFECT_PREFIX(=effect prefix)
 *   -> systemEffect[prefix+"01"] = 巅峰专属强化项（NAME含"巅峰"）
 *   -> PARAM_LEVEL 第 level 行取值
 *
 * 涵盖多类：结构(EID=10)/伤害(EID=None或12350)/维修(EID=12050)等。
 * 特定巅峰等级才解锁。
 *
 * 锚点（斗牛40501）：
 *   巅峰5:  field[1]=405010270,2  → 巅峰结构增强 L2=200(万分比)
 *   巅峰10: field[1]=405010170,1;405010171,1;405010270,3
 *           → 强化充能功率 L1=2(伤害) + 强化脉冲聚焦 L1=2(伤害) + 巅峰结构增强 L3=300
 *   巅峰20: 405010170,3;405010171,3;405010270,5
 *           → 伤害×2 L3=6 + 巅峰结构增强 L5=500
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadClientDataFromDir } from './nodeUtils.js';
import { parsePeakRewardString, computePeakBonus } from '../../src/data/peakLevel.js';
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

console.log('=== 巅峰强化奖励测试 (field[1]) ===\n');

// ===== 测试1: parsePeakRewardString 解析 =====
console.log('[测试1] parsePeakRewardString 解析 field[1]');
{
  const entries = parsePeakRewardString('405010270,2;405010170,1;');
  assert(entries.length === 2, `解析2条 (实际${entries.length})`);
  assert(entries[0].enhanceId === '405010270', `第1条 enhanceId=405010270`);
  assert(entries[0].level === 2, `第1条 level=2`);
  assert(entries[1].enhanceId === '405010170', `第2条 enhanceId=405010170`);
  assert(entries[1].level === 1, `第2条 level=1`);
  // 空串
  assert(parsePeakRewardString('').length === 0, `空串返回0条`);
}

// ===== 测试2: 斗牛40501巅峰5 → 巅峰结构增强 L2=200 =====
console.log('\n[测试2] 斗牛40501巅峰5 巅峰结构增强 L2=200');
{
  const bonus = computePeakBonus(store, '40501', 5);
  // field[0]: 4050101,5(强化充能功率) + 4050103,1(燃烧效率)
  // field[1]: 405010270,2 → 巅峰结构增强 L2=200
  assert(bonus.reward.structurePermille === 200, `巅峰5 结构奖励万分比=200 (实际${bonus.reward.structurePermille})`);
  assert(bonus.reward.details.length === 1, `巅峰5 奖励明细1条 (实际${bonus.reward.details.length})`);
  const det = bonus.reward.details[0];
  assert(det.enhanceId === '405010270', `明细 enhanceId=405010270`);
  assert(det.level === 2, `明细 level=2`);
  assert(det.effectId === 10, `明细 effectId=10(结构)`);
  assert(det.name === '巅峰结构增强', `明细 name=巅峰结构增强 (实际${det.name})`);
}

// ===== 测试3: 斗牛40501巅峰10 → 结构L3=300 + 伤害类 =====
console.log('\n[测试3] 斗牛40501巅峰10 结构L3=300 + 伤害类');
{
  const bonus = computePeakBonus(store, '40501', 10);
  // field[1]: 405010170,1 + 405010171,1 + 405010270,3
  assert(bonus.reward.structurePermille === 300, `巅峰10 结构奖励=300 (实际${bonus.reward.structurePermille})`);
  assert(bonus.reward.details.length === 3, `巅峰10 奖励明细3条 (实际${bonus.reward.details.length})`);
  // 结构类明细
  const structDet = bonus.reward.details.find(d => d.enhanceId === '405010270');
  assert(structDet?.level === 3, `巅峰10 结构项 level=3`);
  assert(structDet?.value === 300, `巅峰10 结构项 value=300`);
  // 伤害类明细（EFFECT_ID=None，记录但不聚合到 structurePermille）
  const dmgDet = bonus.reward.details.find(d => d.enhanceId === '405010170');
  assert(dmgDet?.name === '强化充能功率', `巅峰10 伤害项 name=强化充能功率 (实际${dmgDet?.name})`);
  assert(dmgDet?.value === 2, `巅峰10 伤害项 value=2 (实际${dmgDet?.value})`);
}

// ===== 测试4: 斗牛40501巅峰20 → 结构L5=500 =====
console.log('\n[测试4] 斗牛40501巅峰20 结构L5=500');
{
  const bonus = computePeakBonus(store, '40501', 20);
  assert(bonus.reward.structurePermille === 500, `巅峰20 结构奖励=500 (实际${bonus.reward.structurePermille})`);
  const structDet = bonus.reward.details.find(d => d.enhanceId === '405010270');
  assert(structDet?.level === 5, `巅峰20 结构项 level=5`);
}

// ===== 测试5: 无巅峰时 reward 为空 =====
console.log('\n[测试5] 无巅峰时 reward 为空');
{
  const bonus = computePeakBonus(store, '40501', 0);
  assert(bonus.reward.structurePermille === 0, `巅峰0 结构奖励=0`);
  assert(bonus.reward.details.length === 0, `巅峰0 奖励明细0条`);
}

// ===== 测试6: resolveBlueprint 接入巅峰奖励结构加成（field[1] 叠加到总值）=====
console.log('\n[测试6] resolveBlueprint 巅峰奖励叠加到 finalStructure');
{
  // 斗牛40501 base=36040，无模块结构加成
  // 巅峰5: field[0] 龙骨结构增强 L5=2745(绝对值) + field[1] 巅峰结构增强 L2=200(万分比=2%)
  // finalStructure = floor(36040 × 1.02) + 2745 + 0 = 36760 + 2745 = 39505
  const bp0 = resolveBlueprint(store, '40501', '', { peakLevel: 0 });
  const bp5 = resolveBlueprint(store, '40501', '', { peakLevel: 5 });
  assert(bp5.finalStructure > bp0.finalStructure, `巅峰5 finalStructure(${bp5.finalStructure}) > 巅峰0(${bp0.finalStructure})`);
  assert(bp5.peakStructureBonus === 2745, `巅峰5 field[0]结构绝对值=2745 (实际${bp5.peakStructureBonus})`);
  assert(bp5.peakRewardStructurePermille === 200, `巅峰5 field[1]结构万分比=200 (实际${bp5.peakRewardStructurePermille})`);
  // finalStructure 含 field[1] 的 2% 加成：floor(36040×1.02)+2745 = 39505
  assert(bp5.finalStructure === 39505, `巅峰5 finalStructure=39505(含field[1]) (实际${bp5.finalStructure})`);
}

console.log('\n=== 测试完成 ===');
