/**
 * CV3000 结构值闭环验证（里程碑1核心测试）
 *
 * 验证目标：传入 CV3000 战报科技串，resolveBlueprint 输出 finalStructure === 370192（误差0）。
 *
 * 铁证依据（docs/11 §2.3）：
 *   CV3000 基础结构 278340（cfg_ship[80201][4]）
 *   装配 3 个结构强化（EFFECT_ID=10）：
 *     1132(焊接II) lv5 → PARAM_LEVEL[5]=1400
 *     1131(龙骨II) lv5 → PARAM_LEVEL[5]=1400
 *     8890(抗冲击) lv1 → EFFECT_PARAM=500
 *   合计 3300（万分比）= 33%
 *   278340 × 1.33 = 370192 = 战报实测（误差0）
 *
 * 数据来源：data/client/battle_report_today1/team_battle_data_decoded.txt
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { resolveBlueprint, type ClientDataStore } from '../../src/data/index.js';
import { loadClientDataFromDir } from './nodeUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// 配置表目录：仓库根/data/client/config
const configDir = join(__dirname, '..', '..', '..', '..', 'data', 'client', 'config');

// 配置表加载（所有测试共用，避免重复读盘）
let _store: ClientDataStore | null = null;
async function getStore(): Promise<ClientDataStore> {
  if (!_store) _store = await loadClientDataFromDir(configDir);
  return _store;
}

// CV3000 战报科技串（来自 battle_report_today1，我方 CV3000 块0 字段[8]）
const CV3000_TECH_STR =
  '8020104,20,8206,1;8020110,20,8207,1;8020109,2,1132,5,1,1131,5,3,1210,5,4,1211,5,8,8890,1;8020112,19,8601,1,20,8210,1,5,8701,1;8020101,20,8206,1;';

test('CV3000 基础结构值 = 278340', async () => {
  const store = await getStore();
  const bp = resolveBlueprint(store, '80201', '');
  assert.equal(bp.baseStructure, 278340);
});

test('CV3000 强化后结构值 = 370192（误差0）', async () => {
  const store = await getStore();
  const bp = resolveBlueprint(store, '80201', CV3000_TECH_STR);
  assert.equal(bp.finalStructure, 370192);
});

test('CV3000 解析出 3 个结构强化（EFFECT_ID=10），PARAM 合计 3300', async () => {
  const store = await getStore();
  const bp = resolveBlueprint(store, '80201', CV3000_TECH_STR);
  const structEffects = bp.effects.filter((e) => e.effectId === 10);
  assert.equal(structEffects.length, 3, '应有 3 个结构强化效果');

  // 三个 techId 分别是 1132/1131/8890
  const techIds = structEffects.map((e) => e.tech.techId).sort();
  assert.deepEqual(techIds, [1131, 1132, 8890]);

  // PARAM 合计 = 1400 + 1400 + 500 = 3300
  const sum = structEffects.reduce((acc, e) => acc + e.value, 0);
  assert.equal(sum, 3300, '万分比合计应为 3300（=33%）');
});

test('CV3000 8890(抗冲击) 走 direct 模式，1132/1131 走 param_level 模式', async () => {
  const store = await getStore();
  const bp = resolveBlueprint(store, '80201', CV3000_TECH_STR);
  const byTechId = new Map(bp.effects.map((e) => [e.tech.techId, e]));

  assert.equal(byTechId.get(8890)?.source, 'direct');
  assert.equal(byTechId.get(8890)?.value, 500);

  assert.equal(byTechId.get(1132)?.source, 'param_level');
  assert.equal(byTechId.get(1132)?.value, 1400);

  assert.equal(byTechId.get(1131)?.source, 'param_level');
  assert.equal(byTechId.get(1131)?.value, 1400);
});

test('CV3000 全部 EFFECT 收录到 effects（无 unresolved）', async () => {
  const store = await getStore();
  const bp = resolveBlueprint(store, '80201', CV3000_TECH_STR);
  // 所有 EFFECT_ID 都已收录到 effects[]，unresolved 只在 system_effect 查不到时才有
  assert.equal(bp.unresolved.length, 0, '无未解析项（全部EFFECT已归类）');
  // 2065(战略打击)应在 effects 里，分类为 flagship
  const flagshipEffects = bp.effects.filter((e) => e.category === 'flagship');
  assert.ok(flagshipEffects.length > 0, '应有旗舰类效果');
});
