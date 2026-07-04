/**
 * 模块结构值联动测试（Layer1：装甲模块 EID=10 万分比 × baseStructure）
 *
 * 客户端规则（已验证）：装甲模块的 cfg_module_effect 里，
 *   EFFECT_ID=10 PARAM（万分比）= 舰船结构值提升比例。
 *   moduleStructureBonus = floor(baseStructure × ΣPARAM / 10000)
 *
 * 三大基础属性完全平行，都从 cfg_module_effect 取：
 *   EID=10033 抵抗（绝对值）/ EID=10021 护盾（百分比）/ EID=10 结构（万分比）
 *
 * 分层模型：
 *   Layer0 baseStructure（cfg_ship[4]，出厂值）
 *   Layer1 moduleStructureBonus（装甲模块 EID=10）→ skeleton = Layer0 + Layer1
 *   Layer2 强化(permille)作用于 skeleton + 巅峰(绝对值) + 技术值(绝对值)
 *
 * 数据锚点（来自客户端 cfg_module_effect + cfg_ship 反算，全部精确匹配）：
 *   36052 ASX-150强效纳米装甲: PARAM=1800(18%)
 *     60501 base=180470 → bonus=32484 → skeleton=212954
 *     60101/63501/66501 同 base 同 bonus
 *   36032 ASX-100附加装甲: PARAM=2000(20%)
 *     60301 base=136510 → bonus=27302 → skeleton=163812
 *   34052 ASX-30附加装甲: PARAM=1000(10%)
 *     41202 base=37090 → bonus=3709 → skeleton=40799
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { loadClientDataFromDir } from './nodeUtils.js';
import {
  resolveBlueprintPanel,
  resolveShipWeapons,
  loadWeaponPriority,
} from '../../src/data/blueprintCalc.js';
import { resolveBlueprint } from '../../src/data/blueprintResolver.js';
import type { ClientDataStore } from '../../src/data/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = join(__dirname, '..', '..', '..', '..', 'data', 'client', 'config');

// 加载武器优先级表（resolveBlueprintPanel 内部依赖）
const wp = JSON.parse(readFileSync(join(CONFIG_DIR, 'weapon_priority.json'), 'utf-8'));
loadWeaponPriority(wp);

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`  ✗ FAIL: ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`  ✓ PASS: ${msg}`);
  }
}

const store: ClientDataStore = loadClientDataFromDir(CONFIG_DIR);

console.log('=== 模块结构值联动测试 (Layer1: EID=10 万分比) ===\n');

// ===== 测试1: 60501 默认（不启用装甲模块）→ 无结构加成 =====
console.log('[测试1] 60501 默认（无 enabledSlots）');
{
  const panel = resolveBlueprintPanel(store, '60501', '', null);
  assert(panel.baseStructure === 180470, `60501 baseStructure=180470 (实际${panel.baseStructure})`);
  assert(panel.moduleStructureBonus === 0, `60501 默认 moduleStructureBonus=0 (实际${panel.moduleStructureBonus})`);
  assert(panel.structure === 180470, `60501 默认 skeleton=180470 (实际${panel.structure})`);
}

// ===== 测试2: 60501 装模块36052（启用系统6050110）→ 结构+32484 =====
console.log('\n[测试2] 60501 + 模块36052 (enabledSlots=["6050110"])');
{
  const panel = resolveBlueprintPanel(store, '60501', '', null, ['6050110']);
  assert(panel.baseStructure === 180470, `60501 baseStructure=180470 (实际${panel.baseStructure})`);
  assert(panel.moduleStructureBonus === 32484, `60501+36052 moduleStructureBonus=32484 (实际${panel.moduleStructureBonus})`);
  assert(panel.structure === 212954, `60501+36052 skeleton=212954 (实际${panel.structure})`);
  assert(panel.finalStructure === 212954, `60501+36052 finalStructure=212954 无强化 (实际${panel.finalStructure})`);
}

// ===== 测试3: 同基础值的姊妹舰一致性（60101/63501/66501 同 base 同 bonus）=====
console.log('\n[测试3] 姊妹舰一致性（60101/63501/66501 同 base=180470）');
for (const sid of ['60101', '63501', '66501']) {
  const panel = resolveBlueprintPanel(store, sid, '', null, ['6050110'.replace('60501', sid)]);
  assert(panel.baseStructure === 180470, `${sid} baseStructure=180470`);
  assert(panel.moduleStructureBonus === 32484, `${sid} moduleStructureBonus=32484 (实际${panel.moduleStructureBonus})`);
  assert(panel.structure === 212954, `${sid} skeleton=212954`);
}

// ===== 测试4: resolveBlueprint 接收 moduleStructureBonus，强化作用于 skeleton =====
console.log('\n[测试4] resolveBlueprint 强化作用于 skeleton（含模块）');
{
  // 60501 + 36052 skeleton=212954，无强化 permille，无装配点（不传 installPoints）
  // finalStructure = 212954
  const bp = resolveBlueprint(store, '60501', '', { moduleStructureBonus: 32484 });
  assert(bp.baseStructure === 180470, `resolver baseStructure=180470 (实际${bp.baseStructure})`);
  assert(bp.moduleStructureBonus === 32484, `resolver moduleStructureBonus=32484 (实际${bp.moduleStructureBonus})`);
  assert(bp.finalStructure === 212954, `resolver 无强化 finalStructure=212954 (实际${bp.finalStructure})`);
}

// ===== 测试5: resolveBlueprint 不传 moduleStructureBonus（向后兼容，默认0）=====
console.log('\n[测试5] resolveBlueprint 向后兼容（不传 moduleStructureBonus）');
{
  const bp = resolveBlueprint(store, '60501', '');
  assert(bp.moduleStructureBonus === 0, `默认 moduleStructureBonus=0 (实际${bp.moduleStructureBonus})`);
  assert(bp.baseStructure === 180470, `baseStructure=180470`);
  assert(bp.finalStructure === 180470, `无强化无模块 finalStructure=180470 (实际${bp.finalStructure})`);
}

// ===== 测试6: 其他装甲模块 PARAM 验证（34052@41202, 36032@60301）=====
console.log('\n[测试6] 其他装甲模块 PARAM 万分比验证');
{
  // 41202 装 34052（PARAM=1000=10%），需启用其装甲系统
  // 先找 41202 装甲系统的 systemId
  const sys = store.shipSystem as Record<string, Record<string, unknown>>;
  let armorSys41202 = '';
  for (const k in sys) {
    if (k.startsWith('41202') && (sys[k].SYSTEM_LABEL === '装甲' || sys[k].SYSTEM_TYPE === 4)) {
      armorSys41202 = k;
      break;
    }
  }
  if (armorSys41202) {
    const panel = resolveBlueprintPanel(store, '41202', '', null, [armorSys41202]);
    assert(panel.baseStructure === 37090, `41202 baseStructure=37090 (实际${panel.baseStructure})`);
    assert(panel.moduleStructureBonus === 3709, `41202+34052 moduleStructureBonus=3709 (实际${panel.moduleStructureBonus})`);
    assert(panel.structure === 40799, `41202+34052 skeleton=40799 (实际${panel.structure})`);
  } else {
    console.log('  (跳过: 41202 装甲系统未找到)');
  }
}

console.log('\n=== 测试完成 ===');
