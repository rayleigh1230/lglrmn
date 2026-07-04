/**
 * 受维修量提升测试（repairGain = 装甲抵抗值 × 0.1）
 *
 * ★公式（斗牛实测锚点验证）：
 *   受维修量提升% = (装甲模块抵抗 + 装甲强化抵抗) × 0.1
 *   - 装甲模块抵抗 = cfg_module_effect EID=10033（装甲模块给的）
 *   - 装甲强化抵抗 = cfg_system_effect EID=10033（装甲淬火/刚性等强化项）
 *   - 不含 ship_type[8] 基础抵抗
 *   - 系数 0.1 来自客户端 dump 的 cfg_ship_type.repair_adjust_coef
 *
 * 锚点（斗牛40501，用户实测）：
 *   基础（无强化）= 模块抵抗20 × 0.1 = 2.0%
 *   强化影响 = 强化抵抗16（淬火8+刚性8）× 0.1 = 1.6%
 *   总计 = 3.6%
 *
 * 注意：这与系统自维修(EID=12050 强化维修光束)不同——
 *   repairGain 是受维修量提升（和抵抗联动），repairEfficiency 是系统自维修效率。
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { loadClientDataFromDir } from './nodeUtils.js';
import { resolveBlueprintPanel, loadWeaponPriority } from '../../src/data/blueprintCalc.js';
import { resolveBlueprint } from '../../src/data/blueprintResolver.js';
import type { ClientDataStore } from '../../src/data/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = join(__dirname, '..', '..', '..', '..', 'data', 'client', 'config');

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

console.log('=== 受维修量提升测试 (repairGain) ===\n');

// ===== 测试1: 斗牛无强化 → 基础 2.0% =====
console.log('[测试1] 斗牛40501 无强化 repairGain=2.0%（模块抵抗20×0.1）');
{
  // 不传 blueprint（无强化），resistance 只含模块 EID=10033
  const panel = resolveBlueprintPanel(store, '40501', '', null);
  // 斗牛模块39992 EID=10033=20 → repairGain = 20×0.1 = 2.0
  assert(panel.repairGain === 2.0, `斗牛无强化 repairGain=2.0 (实际${panel.repairGain})`);
  assert(panel.resistance === 20, `斗牛无强化 resistance=20(模块) (实际${panel.resistance})`);
}

// ===== 测试2: 斗牛强化后 → 3.6% =====
console.log('\n[测试2] 斗牛40501 强化后 repairGain=3.6%（模块20+强化16）×0.1');
{
  // 装甲淬火4级+刚性4级 = 强化抵抗16
  // 斗牛slot02装甲: optIdx3=淬火(1207), optIdx4=刚性(1206)
  const techStr = '4050102,3,1207,4,4,1206,4;';
  const blueprint = resolveBlueprint(store, '40501', techStr);
  const panel = resolveBlueprintPanel(store, '40501', '', blueprint);
  // resistance = 模块20 + 强化16 = 36
  assert(panel.resistance === 36, `斗牛强化后 resistance=36(20模块+16强化) (实际${panel.resistance})`);
  // repairGain = 36 × 0.1 = 3.6
  assert(panel.repairGain === 3.6, `斗牛强化后 repairGain=3.6 (实际${panel.repairGain})`);
}

// ===== 测试3: 强化影响单独验证（1.6%）=====
console.log('\n[测试3] 强化影响 = 强化抵抗增加值 × 0.1');
{
  const panelNoEnh = resolveBlueprintPanel(store, '40501', '', null);
  const techStr = '4050102,3,1207,4,4,1206,4;';
  const blueprint = resolveBlueprint(store, '40501', techStr);
  const panelWithEnh = resolveBlueprintPanel(store, '40501', '', blueprint);
  const enhImpact = panelWithEnh.repairGain - panelNoEnh.repairGain;
  assert(enhImpact === 1.6, `强化影响=1.6%（强化抵抗16×0.1）(实际${enhImpact})`);
}

// ===== 测试4: 无装甲模块的船 repairGain=0 =====
console.log('\n[测试4] 无装甲抵抗的船 repairGain=0');
{
  // SC002侦察机(10201) 无装甲模块抵抗
  const panel = resolveBlueprintPanel(store, '10201', '', null);
  assert(panel.repairGain === 0, `侦察机无装甲抵抗 repairGain=0 (实际${panel.repairGain})`);
}

// ===== 测试5: 不同舰种系数验证 =====
console.log('\n[测试5] 不同舰种系数（护卫0.05/驱逐0.1/巡洋0.2/超主力0.25）');
{
  // 各舰种 + 系数 + 示例船
  const cases: [string, string, number][] = [
    // [shipId, 舰名说明, 系数]
    ['30101', 'FG300护卫舰(0.05)', 0.05],
    ['40501', '斗牛驱逐舰(0.1)', 0.1],
    ['51101', '猎兵巡洋舰(0.2)', 0.2],
    ['60301', 'ST59战巡(0.25)', 0.25],
    ['80201', 'CV3000航母(0.25)', 0.25],
  ];
  for (const [sid, label, coef] of cases) {
    const panel = resolveBlueprintPanel(store, sid, '', null);
    const expected = Math.round(panel.resistance * coef * 100) / 100;
    assert(panel.repairGain === expected, `${label} repairGain=${expected}(resist${panel.resistance}×${coef}) (实际${panel.repairGain})`);
  }
}

// ===== 测试6: 战机/护航艇无受维修加成 =====
console.log('\n[测试6] 战机/护航艇 repairGain=0（无受维修加成）');
{
  // SC002侦察机(战机) 和护航艇类
  const panel = resolveBlueprintPanel(store, '10201', '', null);
  assert(panel.repairGain === 0, `侦察机(战机) repairGain=0 (实际${panel.repairGain})`);
}

console.log('\n=== 测试完成 ===');
