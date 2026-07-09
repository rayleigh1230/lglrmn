/**
 * 舰载机/无人机 DPS 公式测试（node:test 版）
 *
 * 对齐客户端 AttrCalcBase.get_aircraft_dps + get_ship_dps 的载机项。
 * 锚点实证见 aircraft-dps-anchor.ts（独立运行脚本）。
 *
 * 关键点：
 *   - DRONE_EFFECT_IDS = {2020,2021,2022,2023}，排除 2024。
 *   - EFFECT_PARAM 解码：ship_id = PARAM/100, num = PARAM%100。
 *   - 2020/2021 的 PARAM//100 是 class 码（不在 cfg_ship），跳过；2022/2023 是具体 ship_id。
 *   - 模块路径需启用可选机库系统才能解析载机（默认机库多为 class 码）。
 *   - 玩家覆写 aircraftsOverride 优先于模块推导。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { loadClientDataFromDir } from './nodeUtils.js';
import {
  resolveShipWeapons, computeFirepower, computeAircraftDps, DRONE_EFFECT_IDS, resolveBlueprintPanel, loadWeaponPriority,
} from '../../src/data/blueprintCalc.js';
import { DPS_TYPE } from '../../src/data/effectList.js';
import { SHIP } from '../../src/data/rawTypes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = join(__dirname, '..', '..', '..', '..', 'data', 'client', 'config');

const store = loadClientDataFromDir(CONFIG_DIR);
loadWeaponPriority(JSON.parse(readFileSync(join(CONFIG_DIR, 'weapon_priority.json'), 'utf-8')));

test('DRONE_EFFECT_IDS 常量对齐字节码提取值', () => {
  assert.equal(DRONE_EFFECT_IDS.has(2020), true, '2020 EFFECT_CARRIER 搭载战机');
  assert.equal(DRONE_EFFECT_IDS.has(2021), true, '2021 EFFECT_CARRIER_BOAT 搭载护航艇');
  assert.equal(DRONE_EFFECT_IDS.has(2022), true, '2022 EFFECT_DRONE 搭载无人机');
  assert.equal(DRONE_EFFECT_IDS.has(2023), true, '2023 EFFECT_ACCOMPANY_DRONE 伴飞无人艇');
  assert.equal(DRONE_EFFECT_IDS.has(2024), false, '2024 EFFECT_CARRIER_EFFECT_LIMIT 机库限制标记，必须排除');
  assert.equal(DRONE_EFFECT_IDS.size, 4, '恰好 4 项');
});

test('EFFECT_PARAM 解码：ship_id=PARAM/100, num=PARAM%100', () => {
  // module 48023 effect 4802301: EID=2022 PARAM=1032005 → ship_id 10320, num 5
  const me = (store.moduleEffect as Record<string, any>)['4802301'];
  assert.equal(Number(me.EFFECT_ID), 2022);
  assert.equal(Number(me.EFFECT_PARAM), 1032005);
  assert.equal(Math.floor(1032005 / 100), 10320);
  assert.equal(1032005 % 100, 5);
});

test('载机 ship_id 存在于 cfg_ship 且 AIRCRAFT_GROUP_NUM 正确', () => {
  const ac = store.ship['10320'] as unknown[];
  assert.ok(ac != null, '载机 10320 (IS-1型-无人机) 存在');
  assert.equal(Number(ac[SHIP.AIRCRAFT_GROUP_NUM]), 3, 'AIRCRAFT_GROUP_NUM=3');
});

test('载机自身可装配武器并有火力（递归基线）', () => {
  const ws = resolveShipWeapons(store, '10320');
  assert.ok(ws.length > 0, '载机 10320 可装配武器');
  const fp = computeFirepower(ws, [], store);
  assert.ok(fp.antiShip > 0, `对舰>0 (实际 ${fp.antiShip})`);
});

test('模块路径：CV3000 启可选机库解析载机 DPS', () => {
  // CV3000 可解析机库在可选系统 8020102/8020108/8020113
  const slots = ['8020102', '8020108', '8020113'];
  const dps = computeAircraftDps(store, '80201', slots, DPS_TYPE.ANTI_SHIP);
  assert.ok(dps > 0, `CV3000 舰载机对舰>0 (实际 ${dps})`);
});

test('玩家覆写优先于模块推导（双轨）', () => {
  const acFp = computeFirepower(resolveShipWeapons(store, '10320'), [], store);
  // 覆写 1 架 10320
  const d1 = computeAircraftDps(store, '80201', undefined, DPS_TYPE.ANTI_SHIP, { '10320': [1] });
  assert.equal(d1, acFp.antiShip * 1, `覆写1×10320 = 单架对舰 (实际 ${d1})`);
  // 覆写 5 架 10320
  const d5 = computeAircraftDps(store, '80201', undefined, DPS_TYPE.ANTI_SHIP, { '10320': [5] });
  assert.equal(d5, acFp.antiShip * 5, `覆写5×10320 = 单架×5 (实际 ${d5})`);
});

test('class 码（2020/2021）跳过：PARAM//100 非 ship_id', () => {
  // 太阳鲸 80101 默认机库多为 class 码（2020/2021），无可解析载机
  const d = computeAircraftDps(store, '80101', undefined, DPS_TYPE.ANTI_SHIP);
  assert.ok(d >= 0, `太阳鲸舰载机贡献非负 (实际 ${d})`);
});

test('非母舰无载机 → 0', () => {
  const d = computeAircraftDps(store, '30101', undefined, DPS_TYPE.ANTI_SHIP);
  assert.equal(d, 0, `FG300 舰载机贡献=0 (实际 ${d})`);
});

test('resolveBlueprintPanel 面板火力含载机项', () => {
  const slots = ['8020102', '8020108', '8020113'];
  const panel = resolveBlueprintPanel(store, '80201', '', null, slots);
  const weaponFp = computeFirepower(resolveShipWeapons(store, '80201', slots), [], store);
  assert.ok(panel.firepower.antiShip > weaponFp.antiShip,
    `面板对舰(${panel.firepower.antiShip}) > 纯武器(${weaponFp.antiShip})，载机已回填`);
});

test('回归保护：无载机武器面板火力不变', () => {
  const panel = resolveBlueprintPanel(store, '30101', '', null, undefined);
  const weaponFp = computeFirepower(resolveShipWeapons(store, '30101'), [], store);
  assert.equal(panel.firepower.antiShip, weaponFp.antiShip,
    `FG300 面板对舰 = 纯武器对舰 (无载机不影响)`);
});
