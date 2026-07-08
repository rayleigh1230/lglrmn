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

// ===== 测试4: resolveBlueprint 接收 moduleStructureBonus（无强化时模块直接加）=====
console.log('\n[测试4] resolveBlueprint 无强化时 moduleStructureBonus 直接加');
{
  // 60501 + 36052 moduleBonus=32484，无强化 permille，无装配点
  // finalStructure = enhancedBase(=base, 无强化) + moduleBonus = 180470 + 32484 = 212954
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

// ===== 测试7: ★缺陷3修复——模块+强化同时存在时，模块比例不被强化放大（对齐 get_ship_hp）=====
console.log('\n[测试7] 模块+强化共存：模块比例作用于裸 base，不放大（对齐 get_ship_hp）');
{
  // 用 60501(base=180470) + moduleBonus=32484(18%) + 一个结构强化(EID=10 万分比)
  // 找一个能产生结构强化的科技串：CV3000 用的 1131 龙骨II lv5 = 1400‱(14%)
  //   但 1131 是船级专属，60501 不一定有。改用通用思路：
  //   直接验证 finalStructure 公式分层，不依赖具体科技串。
  //
  // 构造：base=180470, moduleBonus=32484, 强化比例=1400‱(14%)
  //   旧（错误）：floor((180470+32484)×1.14) = floor(243186.16) = 243186
  //   新（正确）：floor(180470×1.14) + 32484 = floor(205735.8) + 32484 = 205735 + 32484 = 238219
  //   差异：模块部分不被 14% 放大（少 4540）
  //
  // 用 CV3000(80201) 的科技串产生 1400‱ 强化（1131 lv5），它本身无模块（moduleBonus 由我们传入）
  const CV_TECH = '8020109,2,1132,5,1,1131,5,3,1210,5,4,1211,5,8,8890,1;';
  // 上面 1132(1400)+1131(1400)+8890(500) = 3300‱ 结构强化，但 8890 是 direct(500)。
  // 为了精确控制，只取 1131 单条 = 1400‱。构造最小科技串：
  const bp = resolveBlueprint(store, '80201', '8020109,2,1131,5;', { moduleStructureBonus: 32484 });
  // base=278340, 强化=1400‱(14%), moduleBonus=32484
  const expectedEnhanced = Math.floor(278340 * 1.14); // = 317307.6 → 317307
  const expectedFinal = expectedEnhanced + 32484;     // 模块末尾加，不放大
  assert(bp.structureBonusPermille === 1400, `强化比例=1400‱ (实际${bp.structureBonusPermille})`);
  assert(bp.finalStructure === expectedFinal, `finalStructure=${expectedFinal} 模块不放大 (实际${bp.finalStructure})`);
  // 反证：旧公式会得到 floor((278340+32484)×1.14)=354394，明显偏大
  assert(bp.finalStructure !== Math.floor((278340 + 32484) * 1.14), `不等于旧放大公式 ${Math.floor((278340 + 32484) * 1.14)}`);
  console.log(`  base=278340 强化14% moduleBonus=32484 → final=${bp.finalStructure}（旧放大公式会得${Math.floor((278340 + 32484) * 1.14)}，偏大${Math.floor((278340 + 32484) * 1.14) - bp.finalStructure}）`);
}

console.log('\n=== 测试完成 ===');
