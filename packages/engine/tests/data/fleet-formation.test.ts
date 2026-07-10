/**
 * 舰队编组集成测试（resolveFormation 聚合火力/结构/载机 + 双编队对抗规模）
 *
 * 验证 resolveFormation 正确聚合多船面板（含回填载机 DPS）+ 指挥值校验。
 * 对齐客户端 UI 层逐船求和（无单一 fleet 函数）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { loadClientDataFromDir } from './nodeUtils.js';
import { resolveFormation } from '../../src/data/fleetFormation.js';
import { resolveBlueprintPanel, loadWeaponPriority } from '../../src/data/blueprintCalc.js';
import type { TeamConfigInput, ShipRecordInput } from '../../src/data/fleetFormation.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = join(__dirname, '..', '..', '..', '..', 'data', 'client', 'config');
const store = loadClientDataFromDir(CONFIG_DIR);
loadWeaponPriority(JSON.parse(readFileSync(join(CONFIG_DIR, 'weapon_priority.json'), 'utf-8')));

test('resolveFormation：单船编队火力/结构聚合正确', () => {
  const team: TeamConfigInput = { id: 't1', flagshipUid: 'u1', memberUids: ['u1'] };
  const ships: Record<string, ShipRecordInput> = { u1: { uid: 'u1', shipId: '80201' } };
  const f = resolveFormation(store, team, ships);
  const expectedPanel = resolveBlueprintPanel(store, '80201', '', null, undefined);
  assert.equal(f.members.length, 1);
  assert.equal(f.totalFirepower.antiShip, expectedPanel.firepower.antiShip, '聚合对舰=单船面板对舰');
  assert.equal(f.totalStructure, expectedPanel.finalStructure, '聚合结构=单船面板结构');
  assert.equal(f.flagshipUid, 'u1');
});

test('resolveFormation：多船编队火力/结构求和', () => {
  const team: TeamConfigInput = { id: 't2', flagshipUid: 'u1', memberUids: ['u1', 'u2'] };
  const ships: Record<string, ShipRecordInput> = {
    u1: { uid: 'u1', shipId: '80201' }, // CV3000
    u2: { uid: 'u2', shipId: '30101' }, // FG300
  };
  const f = resolveFormation(store, team, ships);
  const p1 = resolveBlueprintPanel(store, '80201', '', null, undefined);
  const p2 = resolveBlueprintPanel(store, '30101', '', null, undefined);
  assert.equal(f.totalFirepower.antiShip, p1.firepower.antiShip + p2.firepower.antiShip, '对舰=两船之和');
  assert.equal(f.totalStructure, p1.finalStructure + p2.finalStructure, '结构=两船之和');
  assert.equal(f.members.length, 2);
});

test('resolveFormation：载机 aircrafts 透传到面板（双轨入口）', () => {
  // CV3000 + 玩家自选载机覆写
  const team: TeamConfigInput = { id: 't3', flagshipUid: 'u1', memberUids: ['u1'] };
  const ships: Record<string, ShipRecordInput> = {
    u1: { uid: 'u1', shipId: '80201', aircrafts: { '10320': [5] } },
  };
  const f = resolveFormation(store, team, ships);
  const noAc = resolveBlueprintPanel(store, '80201', '', null, undefined);
  // 有载机覆写时对舰火力 > 无载机（10320×5 贡献 2250）
  assert.ok(f.totalFirepower.antiShip > noAc.firepower.antiShip,
    `载机透传后对舰(${f.totalFirepower.antiShip}) > 无载机(${noAc.firepower.antiShip})`);
});

test('resolveFormation：指挥值超限 → valid=false', () => {
  const team: TeamConfigInput = { id: 't4', flagshipUid: 'u1', memberUids: ['u1', 'u2'] };
  const ships: Record<string, ShipRecordInput> = {
    u1: { uid: 'u1', shipId: '80101' }, // 55
    u2: { uid: 'u2', shipId: '80201' }, // 40 → 95
  };
  const f = resolveFormation(store, team, ships, 80); // 用小 cap 测校验逻辑
  assert.equal(f.valid, false, '超限 valid=false');
  assert.equal(f.capacity.overflow, true);
  assert.equal(f.capacity.used, 95);
});

test('resolveFormation：指挥值未超限 → valid=true', () => {
  const team: TeamConfigInput = { id: 't5', flagshipUid: 'u1', memberUids: ['u1'] };
  const ships: Record<string, ShipRecordInput> = { u1: { uid: 'u1', shipId: '80101' } };
  const f = resolveFormation(store, team, ships, 420); // 舰队上限量级
  assert.equal(f.valid, true, '未超限 valid=true');
  assert.equal(f.capacity.used, 55);
});

test('resolveFormation：成员不存在跳过（不抛错）', () => {
  const team: TeamConfigInput = { id: 't6', flagshipUid: 'u1', memberUids: ['u1', 'ghost'] };
  const ships: Record<string, ShipRecordInput> = { u1: { uid: 'u1', shipId: '30101' } };
  const f = resolveFormation(store, team, ships);
  assert.equal(f.members.length, 1, 'ghost 跳过，仅 1 成员');
  // valid=false 因旗舰/成员校验（ghost 不在池）
  assert.equal(f.valid, false);
});

test('resolveFormation：双编队对抗规模（己方+对方各解析）', () => {
  // 模拟战斗配置页：两支 TeamConfig
  const teamA: TeamConfigInput = { id: 'A', flagshipUid: 'a1', memberUids: ['a1', 'a2'] };
  const shipsA: Record<string, ShipRecordInput> = {
    a1: { uid: 'a1', shipId: '80201' },
    a2: { uid: 'a2', shipId: '30101' },
  };
  const teamB: TeamConfigInput = { id: 'B', flagshipUid: 'b1', memberUids: ['b1'] };
  const shipsB: Record<string, ShipRecordInput> = { b1: { uid: 'b1', shipId: '60501' } };
  const fA = resolveFormation(store, teamA, shipsA);
  const fB = resolveFormation(store, teamB, shipsB);
  assert.ok(fA.totalFirepower.antiShip > 0, 'A 方有火力');
  assert.ok(fB.totalFirepower.antiShip > 0, 'B 方有火力');
  assert.equal(fA.members.length, 2);
  assert.equal(fB.members.length, 1);
});
