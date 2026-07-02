/**
 * 斗牛级-脉冲炮驱逐舰 全面板属性验证（里程碑2核心测试）
 *
 * 验证目标：用用户的真实强化方案解析，对照游戏面板数值。
 *
 * 方案（用户提供的强化点，技术值98）：
 *   武器slot01: 强化充能功率5/充能装置5/管线冷却5/瞄准机构2/强化脉冲聚焦5/射击辅助4
 *   装甲slot02: 装甲淬火4/装甲刚性4/龙骨结构增强2
 *   动力slot03: 紧急躲避4/燃烧效率1/引擎出力1/曲率引擎1
 *   能源slot04: 能量核心出力5/核心冷却5
 *   额外: 抗冲击结构调校(结构+5%)、功率矩阵调校(伤害+5%)
 *   巅峰等级5(结构+2745)、版本号(结构+3920)
 *
 * 面板基准（用户提供）：
 *   结构值 45948 / 抵抗值 36 / 护盾 2%
 *   对护卫/驱逐命中 +18%（射击4级12% + 瞄准2级6%）
 *   脉冲炮伤害提升 +20%（充能+聚焦），冷却 -30%（充能装置+管线）
 *   能源: 主系统伤害+10%(能量核心), 主系统冷却-15%(核心冷却)
 *
 * 数值规则（已验证）：
 *   A类(有PARAM_LEVEL): 查表, 万分比
 *   B类(无PARAM_LEVEL): value = PARAM × level / maxLevel
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { resolveBlueprint, type ClientDataStore } from '../../src/data/index.js';
import { loadClientDataFromDir } from './nodeUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const configDir = join(__dirname, '..', '..', '..', '..', 'data', 'client', 'config');

let _store: ClientDataStore | null = null;
async function getStore(): Promise<ClientDataStore> {
  if (!_store) _store = await loadClientDataFromDir(configDir);
  return _store;
}

// 斗牛真实科技串（从蓝图方案 get_ship_bp_enhance_scheme_record 获取，含正确 optIdx）
// 三元组 = (optIdx, PREFIX, level)，optIdx 拼成 enhance_id 后2位
const BULL_TECH_STR =
  '4050105,19,8601,1,20,8210,1;' +
  '4050104,1,4102,5,2,4105,5;' +
  '4050101,20,8206,1,1,105,5,2,106,5,3,303,5,4,304,5,5,203,4,6,204,2;' +
  '4050103,20,8207,1,4,2201,4,1,2101,1,3,2102,1,2,2105,3;' +
  '4050102,3,1207,4,4,1206,4,1,1121,2;';

test('斗牛级基础结构值 = 36040', async () => {
  const store = await getStore();
  const bp = resolveBlueprint(store, '40501', '');
  assert.equal(bp.baseStructure, 36040);
});

test('斗牛级结构强化（仅科技串，不含巅峰/版本号）', async () => {
  const store = await getStore();
  const bp = resolveBlueprint(store, '40501', BULL_TECH_STR);
  // 龙骨增强1121@2 = 4%（万分比400）
  assert.equal(bp.structureBonusPermille, 400, '龙骨2级=4%');
  // 36040 × 1.04 = 37481.6 → floor = 37481
  assert.equal(bp.finalStructure, 37481);
});

test('斗牛级完整结构值 = 45948（科技串+抗冲击调校+巅峰+版本号）', async () => {
  const store = await getStore();
  // 真实科技串 + 抗冲击8890(调校,需手动加) + 巅峰2745 + 版本号(98×40=3920)
  const techWithAntiImpact = BULL_TECH_STR + '4050102,5,8890,1;';
  const bp = resolveBlueprint(store, '40501', techWithAntiImpact, {
    peakStructureBonus: 2745,
    techPoints: 98,
  });
  // 36040 × 1.09(龙骨4%+抗冲击5%) + 2745 + 3920 = 45948
  assert.equal(bp.structureBonusPermille, 900, '龙骨4%+抗冲击5%=9%');
  assert.equal(bp.finalStructure, 45948, '完整结构值=45948(误差0)');
});

test('斗牛级抵抗 = 36（基础20 + 淬火8 + 刚性8）', async () => {
  const store = await getStore();
  const bp = resolveBlueprint(store, '40501', BULL_TECH_STR);
  // 装甲淬火1207@4 = 8×4/4 = 8, 装甲刚性1206@4 = 8×4/4 = 8
  assert.equal(bp.resistanceBonus, 16, '淬火4+刚性4 = 16');
  // 面板抵抗36 = 基础20 + 16
});

test('斗牛级对护卫/驱逐命中 +18%（射击4级12% + 瞄准2级6%）', async () => {
  const store = await getStore();
  const bp = resolveBlueprint(store, '40501', BULL_TECH_STR);
  const hitBonus = bp.hitBonusByTargetClass['frigate_destroyer'] ?? 0;
  // 12% + 6% = 18% = 1800万分比
  assert.equal(hitBonus, 1800, '对护驱命中应为1800万分比(18%)');
});

test('斗牛级闪避 +8%（紧急躲避4级，maxLevel=4，满级8%）', async () => {
  const store = await getStore();
  const bp = resolveBlueprint(store, '40501', BULL_TECH_STR);
  // 2201 PARAM=8, maxLevel=4, lv4 → 8×4/4 = 8% = 800万分比
  assert.equal(bp.dodgeBonus, 800, '闪避应为800万分比(8%)');
});

test('斗牛级脉冲炮冷却下降（充能5+管线5各15%=30%）', async () => {
  const store = await getStore();
  const bp = resolveBlueprint(store, '40501', BULL_TECH_STR);
  // 充能装置303@5 = 15×5/5=15%, 管线304@5 = 15%, 核心冷却4105@5 = 15%
  // 主武器冷却(303+304)与主系统冷却(4105)分别分组
  const allCooldown = Object.values(bp.weaponCooldownReduction).reduce((a, b) => a + b, 0);
  // 至少应有主武器的30%(3000万分比)
  assert.ok(allCooldown >= 3000, `冷却下降合计应≥3000万分比(30%), 实际${allCooldown}`);
});

test('斗牛级脉冲炮伤害提升（真实方案用旧版105/106，数值待精修）', async () => {
  const store = await getStore();
  const bp = resolveBlueprint(store, '40501', BULL_TECH_STR);
  // 真实科技串用旧版105/106（无PARAM_LEVEL），伤害数值待后续精修
  // 4102能量核心也无PARAM_LEVEL. 这说明旧版数值来源不同于新版4050111
  // 此测试验证解析不报错，数值待精修
  assert.ok(bp.effects.length > 0, '应有效果解析');
});

test('斗牛级 B类等级缩放规则验证（射击辅助4级=12%）', async () => {
  const store = await getStore();
  const bp = resolveBlueprint(store, '40501', BULL_TECH_STR);
  // 找射击辅助(techId=203)的解析结果
  const shoot = bp.effects.find((e) => e.tech.techId === 203);
  assert.ok(shoot, '应有射击辅助效果');
  // 203 PARAM后2位=15, maxLevel=5, lv4 → 15×4/5 = 12
  assert.equal(shoot!.value, 12, '射击辅助4级=12%');
  assert.equal(shoot!.maxLevel, 5, '射击辅助maxLevel=5');
});

test('斗牛级 B类maxLevel=3验证（燃烧效率1级=5%）', async () => {
  const store = await getStore();
  const bp = resolveBlueprint(store, '40501', BULL_TECH_STR);
  const burn = bp.effects.find((e) => e.tech.techId === 2101);
  assert.ok(burn, '应有燃烧效率效果');
  // 2101 PARAM=15, maxLevel=3, lv1 → 15×1/3 = 5
  assert.equal(burn!.value, 5, '燃烧效率1级=5%');
  assert.equal(burn!.maxLevel, 3, '燃烧效率maxLevel=3');
});
