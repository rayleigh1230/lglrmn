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

test('V_SKILL_EFFECT_RATIO: 攻城路径把 modDestroyInc 加进 skillRatio（对比无该字段）', () => {
  // 用真实装配的 13731，攻城火力应 > 0 且含 25% skillRatio 放大。
  // 直接用 computeFirepower 对 13731 单武器算攻城，对比一个 modDestroyInc=0 的同参数武器。
  const ws = resolveShipWeapons(store, '37001');
  const w = ws.find(x => x.weaponId === '13731')!;
  const fpWith = computeFirepower([w], [], store);
  // 构造一个 modDestroyInc=0 的克隆
  const wNoInc = { ...w, modDestroyInc: 0 };
  const fpWithout = computeFirepower([wNoInc], [], store);
  assert.ok(fpWith.siege > fpWithout.siege, `含 modDestroyInc 攻城(${fpWith.siege}) > 无(${fpWithout.siege})`);
  // 25% 放大：attack 部分应约 1.25 倍（穿抗后差异，但应明显增大）
  const ratio = fpWith.siege / fpWithout.siege;
  assert.ok(ratio > 1.1, `攻城放大比 ${ratio.toFixed(3)} > 1.1（skillRatio 生效）`);
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
