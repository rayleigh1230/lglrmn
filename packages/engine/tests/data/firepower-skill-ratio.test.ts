/**
 * 火力计算修复验证 —— V_SKILL_EFFECT_RATIO 通道 + 每武器 floor
 *
 * 修复1（V_SKILL_EFFECT_RATIO）：对齐客户端 get_weapon_attack_calc 的 skill_effect_ratio。
 *   武器模块自带的 EFFECT_DAMAGE_INC(12020)/EFFECT_AIRCRAFT_INC(12062)/EFFECT_DESTROY_INC(12060)
 *   原值绑到 V_SKILL_EFFECT_RATIO，进 (100+add_ratio+skill_ratio)/100。
 *   旧实现 skillRatio=0 → 这3类模块加成全丢。
 *
 * 锚点：武器 13731（船37001）的 cfg_module_effect 有 EFFECT_ID=12060(攻城伤害提高) PARAM=25。
 *   攻城路径应把 25 加到 skillRatio → 攻城 attack 放大 (100+25)/100=1.25。
 *
 * 修复2（每武器 floor）：对齐客户端 get_ship_dps_calc 的 _add_new_calc(to_int)。
 *   多武器 + 大 group_num 时，floor-then-sum 与 sum-then-round 会差几。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadClientDataFromDir } from './nodeUtils.js';
import { resolveShipWeapons, computeFirepower, loadWeaponPriority } from '../../src/data/blueprintCalc.js';
import type { ClientDataStore } from '../../src/data/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = join(__dirname, '..', '..', '..', '..', 'data', 'client', 'config');
const store: ClientDataStore = loadClientDataFromDir(CONFIG_DIR);
const { readFileSync } = await import('node:fs');
loadWeaponPriority(JSON.parse(readFileSync(join(CONFIG_DIR, 'weapon_priority.json'), 'utf-8')));

test('V_SKILL_EFFECT_RATIO: 13731 的 modDestroyInc=25 被装配读取', () => {
  const ws = resolveShipWeapons(store, '37001');
  const w = ws.find(x => x.weaponId === '13731');
  assert.ok(w, '37001 装配出 13731');
  assert.equal(w!.modDestroyInc, 25, `13731 modDestroyInc=25 (实际${w!.modDestroyInc})`);
});

test('★双重绑定验证：模块12060/12062同时进 V_ADD_RATIO(effectList) + V_SKILL_EFFECT_RATIO(skillRatio)', () => {
  // 客户端真相（已字节码证实，非反编译伪象）：
  //   get_effect_list: 模块效果进 all_effects_list(is_system_effect=False)
  //   get_cur_enhance_add_info: 遍历 all_effects_list，无 is_system_effect 过滤 → 模块12060/12062 进 V_ADD_RATIO
  //   calc_effect_add: 模块效果走 B类(PARAM×1/1)，12060/12062 在 weapon_num_attr 是 ratio_add → add_ratio += PARAM
  //   get_weapon_attack_calc: 同一 PARAM 又绑 V_SKILL_EFFECT_RATIO（skill_effect_ratio）
  //   → 攻城/对空路径对模块的12060/12062 PARAM 双重计入（客户端真实行为）。
  //
  // 13731(船37001) modDestroyInc=25（EFFECT_DESTROY_INC 攻城伤害提高）：
  //   - V_SKILL_EFFECT_RATIO: skillRatio=25 → (100+25)/100=1.25
  //   - V_ADD_RATIO: effectList 加 12060 value=25 → addRatio+=25 → 同一 (100+25)/100
  //   两者在 (100+add_ratio+skill_ratio)/100 里相加 → 共 +50（25+25）
  const ws = resolveShipWeapons(store, '37001');
  const w = ws.find(x => x.weaponId === '13731')!;
  // 仅 V_SKILL_EFFECT_RATIO（effectList 空，只走 skillRatio=25）
  const fpSkillOnly = computeFirepower([w], [], store);
  // 双绑：把模块12060显式加进 effectList（模拟 resolveBlueprintPanel 的做法）
  const el = [{ effectId: 12060, value: 25, sourceSlotId: w.systemId, targetShip: 0, targetSystem: 0, targetIndex: 0, targetModuleType: 0, targetCompany: 0, isSystemEffect: false }];
  const fpBoth = computeFirepower([w], el, store);
  // 无任何绑定（modDestroyInc=0 + effectList 空）
  const wNone = { ...w, modDestroyInc: 0 };
  const fpNone = computeFirepower([wNone], [], store);
  assert.ok(fpSkillOnly.siege > fpNone.siege, `仅skillRatio 攻城(${fpSkillOnly.siege}) > 无绑定(${fpNone.siege})`);
  assert.ok(fpBoth.siege > fpSkillOnly.siege, `双绑攻城(${fpBoth.siege}) > 仅skillRatio(${fpSkillOnly.siege})（V_ADD_RATIO额外放大）`);
  console.log(`  13731 攻城: 无绑定=${fpNone.siege} / 仅skillRatio(25)=${fpSkillOnly.siege} / 双绑(25+25)=${fpBoth.siege}`);
});

test('普通武器（无12020/12060/12062模块效果）V_SKILL_EFFECT_RATIO=0，火力不受影响', () => {
  // FG300 13011 只有 12300+12156，无 EFFECT_DAMAGE_INC/AIRCRAFT_INC/DESTROY_INC
  const ws = resolveShipWeapons(store, '30101');
  const w = ws.find(x => x.weaponId === '13011')!;
  assert.equal(w.modDamageInc, 0, '13011 modDamageInc=0');
  assert.equal(w.modAircraftInc, 0, '13011 modAircraftInc=0');
  assert.equal(w.modDestroyInc, 0, '13011 modDestroyInc=0');
});

test('group_num: 砂龙(10701) 对舰=120（每武器floor再×5），非123（旧sum-then-round）', () => {
  const ws = resolveShipWeapons(store, '10701');
  const fp = computeFirepower(ws, [], store);
  // 砂龙 group_num=5。每武器对舰 floor 后求和再 ×5 floor。
  // 旧 sum-then-round 得 123，新 floor-then-sum 得 120。
  assert.equal(fp.antiShip, 120, `砂龙对舰=120 (floor-then-sum, 实际${fp.antiShip})`);
});
