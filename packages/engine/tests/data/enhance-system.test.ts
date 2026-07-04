/**
 * 强化系统数据层测试（resolveEnhanceSystem + getEnhanceValue）
 *
 * 锚点来自 cfg_system_enhance.json + cfg_system_effect.json（客户端 dump）：
 *   60501 slot01 (6050101) 普通强化项 optIdx 1-13：
 *     optIdx=1  prefix=109  maxL=4  伤害类(高斯线圈强化)
 *     optIdx=3  prefix=203  maxL=4  命中类(射击辅助增强, EID=12012)
 *     optIdx=7  prefix=161  maxL=4  暴击类(反应式爆炸弹头, EID=12030)
 *     optIdx=10 prefix=9205 maxL=1  频率类(快速输出, EID=12141)
 *     optIdx=12 prefix=8888 maxL=1  调校开启(系统调校, EID=2082)
 *   排除：optIdx=20(维修)/31-43(调校)/70(巅峰) 不应出现在普通强化列表
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadClientDataFromDir } from './nodeUtils.js';
import { resolveEnhanceSystem, getEnhanceValue } from '../../src/data/enhanceSystem.js';
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

console.log('=== 强化系统数据层测试 ===\n');

// ===== 测试1: 60501 强化系统结构 =====
console.log('[测试1] 60501 resolveEnhanceSystem 基本结构');
{
  const sys = resolveEnhanceSystem(store, '60501');
  // 应有多个 slot（01-15 都是系统槽）
  const slotCount = Object.keys(sys.bySlot).length;
  assert(slotCount > 0, `60501 有强化槽位 (实际 ${slotCount} 个 slot)`);

  // slot01 应有 optIdx 1-13（普通强化）
  const slot01 = sys.bySlot['6050101'];
  assert(slot01 != null, `60501 slot01 存在`);
  if (slot01) {
    const optIdxs = slot01.map((s) => s.optIdx);
    assert(optIdxs.includes(1), `slot01 含 optIdx=1 (实际 ${JSON.stringify(optIdxs)})`);
    assert(optIdxs.includes(7), `slot01 含 optIdx=7`);
    assert(!optIdxs.some((o) => o >= 31 && o <= 43), `slot01 排除调校 optIdx 31-43`);
    assert(!optIdxs.includes(20), `slot01 排除维修 optIdx=20`);
    assert(!optIdxs.includes(70), `slot01 排除巅峰 optIdx=70`);
  }
}

// ===== 测试2: 60501 slot01 optIdx=3（射击辅助增强，命中类）字段正确 =====
console.log('\n[测试2] 60501 slot01 optIdx=3 字段（射击辅助增强）');
{
  const sys = resolveEnhanceSystem(store, '60501');
  const slot = sys.bySlot['6050101']?.find((s) => s.optIdx === 3);
  assert(slot != null, `optIdx=3 存在`);
  if (slot) {
    assert(slot.enhanceId === '605010103', `enhanceId=605010103 (实际 ${slot.enhanceId})`);
    assert(slot.slotId === '6050101', `slotId=6050101`);
    assert(slot.effectPrefix === 203, `effectPrefix=203 (实际 ${slot.effectPrefix})`);
    assert(slot.maxLevel === 4, `maxLevel=4 (实际 ${slot.maxLevel})`);
    assert(slot.effect?.effectId === 12012, `effectId=12012 命中类 (实际 ${slot.effect?.effectId})`);
    assert(slot.effect?.label === '命中', `label=命中 (实际 ${slot.effect?.label})`);
  }
}

// ===== 测试3: 60501 slot01 optIdx=7（暴击类，反应式爆炸弹头）=====
console.log('\n[测试3] 60501 slot01 optIdx=7（反应式爆炸弹头，暴击）');
{
  const sys = resolveEnhanceSystem(store, '60501');
  const slot = sys.bySlot['6050101']?.find((s) => s.optIdx === 7);
  assert(slot != null, `optIdx=7 存在`);
  if (slot) {
    assert(slot.effectPrefix === 161, `effectPrefix=161 (实际 ${slot.effectPrefix})`);
    assert(slot.effect?.effectId === 12030, `effectId=12030 暴击 (实际 ${slot.effect?.effectId})`);
    assert(slot.effect?.label === '暴击', `label=暴击 (实际 ${slot.effect?.label})`);
  }
}

// ===== 测试4: 解锁型强化识别（optIdx=11/12 有 UNLOCK_COST_RARITY）=====
console.log('\n[测试4] 解锁型强化识别 + 科技树字段');
{
  const sys = resolveEnhanceSystem(store, '60501');
  const slot11 = sys.bySlot['6050101']?.find((s) => s.optIdx === 11);
  if (slot11) {
    assert(slot11.isUnlockable === true, `optIdx=11 是解锁型 (实际 ${slot11.isUnlockable})`);
  }
  const slot1 = sys.bySlot['6050101']?.find((s) => s.optIdx === 1);
  if (slot1) {
    assert(slot1.isUnlockable === false, `optIdx=1 非解锁型 (实际 ${slot1.isUnlockable})`);
    // 科技树新字段
    assert(Array.isArray(slot1.prerequisites), `optIdx=1 prerequisites 是数组`);
    assert(slot1.prerequisites.length === 0, `optIdx=1 是根节点（prerequisites 空）`);
    assert(typeof slot1.treeColumn === 'number', `optIdx=1 treeColumn 是数字`);
    assert(typeof slot1.nodeFlag === 'number', `optIdx=1 nodeFlag 是数字`);
  }
  // slotInfos 存在
  assert(sys.slotInfos != null, `slotInfos 存在`);
  assert(Object.keys(sys.slotInfos).length > 0, `slotInfos 非空`);
}

// ===== 测试5: getEnhanceValue 等级数值查询（direct 优先 + base 回退）=====
console.log('\n[测试5] getEnhanceValue 等级数值查询');
{
  // optIdx=3 prefix=203 B类：system_effect 存了 20301(PARAM=3015)、20302(PARAM=4015)
  // L1 → direct 20301 = 3015；L2 → direct 20302 = 4015
  // L3/L4 → 无 direct 条目，回退 base 20301 缩放
  const v1 = getEnhanceValue(store, '605010103', 1);
  assert(v1 === 3015, `optIdx=3 L1=3015 direct (实际 ${v1})`);
  const v2 = getEnhanceValue(store, '605010103', 2);
  assert(v2 === 4015, `optIdx=3 L2=4015 direct (实际 ${v2})`);
  const v4 = getEnhanceValue(store, '605010103', 4);
  assert(v4 > 0, `optIdx=3 L4 回退缩放 >0 (实际 ${v4})`);

  // 越界等级返回数值或0（不崩溃）
  const vOverflow = getEnhanceValue(store, '605010103', 99);
  assert(typeof vOverflow === 'number', `越界等级不崩溃 (L99=${vOverflow})`);

  // 不存在的 enhanceId 返回 0
  const vNone = getEnhanceValue(store, '999999999', 1);
  assert(vNone === 0, `不存在的 enhanceId 返回 0 (实际 ${vNone})`);
}

// ===== 测试6: allSlots 扁平列表完整性 =====
console.log('\n[测试6] allSlots 扁平列表完整性');
{
  const sys = resolveEnhanceSystem(store, '60501');
  const flat = sys.allSlots;
  const bySlotTotal = Object.values(sys.bySlot).flat().length;
  assert(flat.length === bySlotTotal, `allSlots(${flat.length}) = bySlot 总和(${bySlotTotal})`);
  assert(flat.every((s) => s.optIdx >= 1 && s.optIdx <= 19), `所有 slot 都是普通强化 optIdx 1-19`);
  assert(flat.every((s) => s.enhanceId.startsWith('60501')), `所有 enhanceId 以 60501 开头`);
}

// ===== 测试7: 全部强化项都有 effectPrefix（数据完整性）=====
console.log('\n[测试7] 数据完整性：全部强化项有 effectPrefix');
{
  const sys = resolveEnhanceSystem(store, '60501');
  const noPrefix = sys.allSlots.filter((s) => !s.effectPrefix);
  assert(noPrefix.length === 0, `无 effectPrefix 的项 = 0 (实际 ${noPrefix.length})`);
  const noMaxLevel = sys.allSlots.filter((s) => s.maxLevel === 0);
  assert(noMaxLevel.length === 0, `无 maxLevel 的项 = 0 (实际 ${noMaxLevel.length})`);
}

console.log('\n=== 测试完成 ===');
