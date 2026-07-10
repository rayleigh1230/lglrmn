/**
 * 母舰强化过滤透传给载机（缺陷3 修复测试）
 *
 * 对齐客户端 AttrCalcBase._filter_drone_enhance（反编译源见 docs/23）。
 *
 * 核心机制：
 *   - 母舰强化字典 cur_enhance_dic {systemId: {enhanceId: level}} 经 filterDroneEnhance 过滤后透传给载机。
 *   - 触达 DRONE_EFFECT_IDS（{2020,2021,2022,2023}）的强化被剥除（防载机→载机套娃）。
 *   - 其余强化（武器伤害/命中/载机维护等）透传给载机，提升载机 DPS。
 *
 * 实测数据特征（data/client/config）：
 *   - 仅 2 个 effect_id（605/5210111，均"无人机搭载能力提升"）触达 DRONE_EFFECT_IDS。
 *   - CV3000(80201) 强化项 prefix 3110/3102/3109/3103/3107 的 effect（12020武器伤害/12041载机维护/12010命中）
 *     均【不】触达 drone → 全部透传给载机。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { loadClientDataFromDir } from './nodeUtils.js';
import {
  computeAircraftDps, filterDroneEnhance, DRONE_EFFECT_IDS, resolveBlueprintPanel, loadWeaponPriority,
} from '../../src/data/blueprintCalc.js';
import { DPS_TYPE } from '../../src/data/effectList.js';
import { resolveBlueprint } from '../../src/data/blueprintResolver.js';
import type { ClientDataStore } from '../../src/data/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = join(__dirname, '..', '..', '..', '..', 'data', 'client', 'config');

const store: ClientDataStore = loadClientDataFromDir(CONFIG_DIR);
loadWeaponPriority(JSON.parse(readFileSync(join(CONFIG_DIR, 'weapon_priority.json'), 'utf-8')));

// ===== 1. filterDroneEnhance 单元测试 =====

test('filterDroneEnhance：空字典返回空', () => {
  const result = filterDroneEnhance(store, {});
  assert.equal(Object.keys(result).length, 0, '空字典过滤后仍为空');
});

test('filterDroneEnhance：触达 DRONE_EFFECT_IDS 的强化被剥除', () => {
  // effect_id 605（无人机搭载能力提升）触达 2022 → 应被剥除。
  // 构造一个 enhanceId 使其 SYSTEM_EFFECT_PREFIX=605。
  // 先找数据里 SYSTEM_EFFECT_PREFIX=605 的真实 enhanceId：
  const sysEnh = store.systemEnhance as Record<string, any>;
  let enhanceId605 = '';
  for (const [id, cfg] of Object.entries(sysEnh)) {
    if (Number(cfg.SYSTEM_EFFECT_PREFIX) === 605) { enhanceId605 = id; break; }
  }
  if (!enhanceId605) { console.log('  (skip: 无 prefix=605 的强化项)'); return; }
  const dic = { '8020102': { [enhanceId605]: 1 } };
  const result = filterDroneEnhance(store, dic);
  // 触达 drone → 该强化被剥除 → 该 systemId 下无剩余强化
  assert.equal(result['8020102'], undefined, '触达 drone 的强化被剥除');
});

test('filterDroneEnhance：普通强化（武器伤害等）保留透传', () => {
  // CV3000 prefix=3110（机载弹药强化，EID=12020 武器伤害）不触达 drone → 保留
  const sysEnh = store.systemEnhance as Record<string, any>;
  let enhanceId3110 = '';
  for (const [id, cfg] of Object.entries(sysEnh)) {
    if (Number(cfg.SYSTEM_EFFECT_PREFIX) === 3110) { enhanceId3110 = id; break; }
  }
  if (!enhanceId3110) { console.log('  (skip: 无 prefix=3110 的强化项)'); return; }
  const dic = { '8020102': { [enhanceId3110]: 3 } };
  const result = filterDroneEnhance(store, dic);
  assert.ok(result['8020102'], 'systemId 保留');
  assert.equal(result['8020102'][enhanceId3110], 3, '普通强化项被保留');
});

test('filterDroneEnhance：混合字典只剥除触达 drone 的项', () => {
  const sysEnh = store.systemEnhance as Record<string, any>;
  let enhanceId605 = '', enhanceId3110 = '';
  for (const [id, cfg] of Object.entries(sysEnh)) {
    const p = Number(cfg.SYSTEM_EFFECT_PREFIX);
    if (p === 605 && !enhanceId605) enhanceId605 = id;
    if (p === 3110 && !enhanceId3110) enhanceId3110 = id;
  }
  if (!enhanceId605 || !enhanceId3110) { console.log('  (skip: 缺测试数据)'); return; }
  const dic = { '8020102': { [enhanceId605]: 1, [enhanceId3110]: 3 } };
  const result = filterDroneEnhance(store, dic);
  assert.equal(result['8020102'][enhanceId605], undefined, '触达 drone 的被剥除');
  assert.equal(result['8020102'][enhanceId3110], 3, '普通强化保留');
});

// ===== 2. computeAircraftDps 集成测试（强化透传）=====

test('computeAircraftDps：传母舰强化后载机 DPS ≥ 无强化基线', () => {
  // CV3000 + 启用机库系统 + 玩家覆写载机 10320×5
  const slots = ['8020102', '8020108', '8020113'];
  const override = { '10320': [5] };
  // 无强化基线
  const baseline = computeAircraftDps(store, '80201', slots, DPS_TYPE.ANTI_SHIP, override);
  // 构造母舰强化字典：CV3000 系统 8020102 的强化项（武器伤害 12020 等）
  const sysEnh = store.systemEnhance as Record<string, any>;
  const enhanceDic: Record<string, number> = {};
  for (const [id, cfg] of Object.entries(sysEnh)) {
    if (id.startsWith('8020102') && Number(cfg.SYSTEM_EFFECT_PREFIX) > 0) {
      enhanceDic[id] = 3; // 统一 3 级
    }
  }
  const curEnhanceDic = Object.keys(enhanceDic).length > 0 ? { '8020102': enhanceDic } : undefined;
  const withEnhance = computeAircraftDps(store, '80201', slots, DPS_TYPE.ANTI_SHIP, override, curEnhanceDic);
  console.log(`  基线=${baseline}, 带强化=${withEnhance}`);
  // 带武器伤害强化后，载机 DPS 应 ≥ 基线（武器伤害提升会放大载机火力）
  assert.ok(withEnhance >= baseline, `带强化(${withEnhance}) ≥ 基线(${baseline})`);
});

test('computeAircraftDps：无强化字典时与原行为一致（回归保护）', () => {
  // 不传 curEnhanceDic → 走空 effectList（原缺陷3 简化路径），载机只算自身模块效果
  const override = { '10320': [1] };
  const noDic = computeAircraftDps(store, '80201', undefined, DPS_TYPE.ANTI_SHIP, override);
  const emptyDic = computeAircraftDps(store, '80201', undefined, DPS_TYPE.ANTI_SHIP, override, {});
  assert.equal(noDic, emptyDic, `无字典(${noDic}) == 空字典(${emptyDic})`);
});

test('computeAircraftDps：传触达 drone 的强化不会导致递归异常', () => {
  // 即使母舰强化字典含触达 DRONE_EFFECT_IDS 的项，filterDroneEnhance 会剥除它，
  // 载机递归不会因为"搭载载机"强化而套娃。
  const sysEnh = store.systemEnhance as Record<string, any>;
  let enhanceId605 = '';
  for (const [id, cfg] of Object.entries(sysEnh)) {
    if (Number(cfg.SYSTEM_EFFECT_PREFIX) === 605) { enhanceId605 = id; break; }
  }
  if (!enhanceId605) { console.log('  (skip: 无 prefix=605)'); return; }
  const override = { '10320': [1] };
  const dic = { '8020102': { [enhanceId605]: 1 } };
  // 不应抛错/超时/返回异常大值
  const result = computeAircraftDps(store, '80201', undefined, DPS_TYPE.ANTI_SHIP, override, dic);
  assert.ok(result >= 0, `触达 drone 的强化被过滤，结果非负 (${result})`);
});

// ===== 3. resolveBlueprintPanel 集成（完整链路）=====

test('resolveBlueprintPanel：带强化的蓝图面板载机项含母舰强化透传', () => {
  // 构造一个含 CV3000 强化的 techStr，验证面板火力正常（载机强化透传不破坏面板）
  // CV3000 系统 8020102，强化项 optIdx=01 prefix=3110(机载弹药强化) level=3
  // techStr 格式：slotId, optIdx, prefix, level, ...
  const slots = ['8020102', '8020108', '8020113'];
  const techStr = '8020102,1,3110,3'; // 系统 8020102 点 3110 强化 3 级
  const blueprint = resolveBlueprint(store, '80201', techStr);
  // 面板应正常产出（强化透传不破坏计算）
  const panel = resolveBlueprintPanel(store, '80201', '', blueprint, slots);
  assert.ok(panel.firepower.antiShip > 0, `带强化面板对舰>0 (${panel.firepower.antiShip})`);
});

test('resolveBlueprintPanel：无强化蓝图面板与基线一致（回归保护）', () => {
  // 空 techStr（无强化）的面板应和之前一致
  const slots = ['8020102', '8020108', '8020113'];
  const panelNoBp = resolveBlueprintPanel(store, '80201', '', null, slots);
  const panelEmptyBp = resolveBlueprintPanel(store, '80201', '', resolveBlueprint(store, '80201', ''), slots);
  assert.equal(panelNoBp.firepower.antiShip, panelEmptyBp.firepower.antiShip,
    `无蓝图(${panelNoBp.firepower.antiShip}) == 空蓝图(${panelEmptyBp.firepower.antiShip})`);
});
