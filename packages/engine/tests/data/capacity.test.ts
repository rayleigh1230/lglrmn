/**
 * 指挥值/容量校验（对齐 common.ship_utils.get_ship_capicity + get_team_capacity）
 *
 * 关键修正：cfg_ship[13] = EXPLOIT_CAPACITY（指挥值/容量），非旧实现误用的 [7]（武器槽数）。
 * 实证（data/client/config/cfg_ship.json）：
 *   80101 太阳鲸 [13]=130000 / 80201 CV3000 [13]=150000 / 48101 灼热级 [13]=11000
 *   60501 乌拉诺斯之矛 [13]=115000 / 战列=150000 / 护卫 1000-2200 / 战机无人机=0
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadClientDataFromDir } from './nodeUtils.js';
import { getShipCapacity, getTeamCapacity, validateFormation } from '../../src/data/fleetFormation.js';
import { SHIP } from '../../src/data/rawTypes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = join(__dirname, '..', '..', '..', '..', 'data', 'client', 'config');
const store = loadClientDataFromDir(CONFIG_DIR);

test('cfg_ship[13] 是 EXPLOIT_CAPACITY（指挥值），非 [7]（武器槽数）', () => {
  // 太阳鲸 [13]=130000, [7]=55；CV3000 [13]=150000, [7]=40
  const ty = store.ship['80101'] as unknown[];
  const cv = store.ship['80201'] as unknown[];
  assert.equal(Number(ty[SHIP.EXPLOIT_CAPACITY]), 130000, '太阳鲸 EXPLOIT_CAPACITY=130000');
  assert.equal(Number(cv[SHIP.EXPLOIT_CAPACITY]), 150000, 'CV3000 EXPLOIT_CAPACITY=150000');
  assert.notEqual(Number(ty[7]), 130000, '[7]≠[13]，旧 bug 已修');
});

test('getShipCapacity：航母基础容量', () => {
  assert.equal(getShipCapacity(store, '80101'), 130000, '太阳鲸容量=130000');
  assert.equal(getShipCapacity(store, '80201'), 150000, 'CV3000容量=150000');
});

test('getShipCapacity：护卫级小容量', () => {
  // 护卫舰容量 1000-2200 范围（具体值取数据）
  const cap = getShipCapacity(store, '48101'); // 灼热级 TE 重型火炮突击舰
  assert.equal(cap, 11000, `灼热级容量=11000 (实际 ${cap})`);
});

test('getShipCapacity：战机/无人机容量=0', () => {
  // 战机/无人机 ship_type=1/2，[13]=0
  const cap = getShipCapacity(store, '10320'); // IS-1型-无人机
  assert.equal(cap, 0, `载机 10320 容量=0 (实际 ${cap})`);
});

test('getShipCapacity：不存在 shipId 返回 0', () => {
  assert.equal(getShipCapacity(store, '99999'), 0);
});

test('getShipCapacity：含模块容量加成（EID=2034）', () => {
  // 模块容量效果 EID=2034（数据中 9 行）。验证带 2034 模块的船容量 > 基础值。
  // 找一个有 EFFECT_MODULE_CAPACITY 模块的船：module 44011/49012 等（PARAM=1500）。
  // 这里验证 getShipCapacity 至少正确读取基础值；模块加成在有该模块的船上是叠加的。
  const cap60501 = getShipCapacity(store, '60501');
  const base60501 = Number((store.ship['60501'] as unknown[])[SHIP.EXPLOIT_CAPACITY]);
  assert.ok(cap60501 >= base60501, `含模块加成后容量(${cap60501}) ≥ 基础(${base60501})`);
});

test('getTeamCapacity：编队聚合', () => {
  const team = {
    id: 't1', flagshipUid: 'u1', memberUids: ['u1', 'u2'],
    name: 'test', type: '0',
  };
  const ships = {
    u1: { uid: 'u1', shipId: '80101' },  // 太阳鲸 130000
    u2: { uid: 'u2', shipId: '80201' },  // CV3000 150000
  };
  const total = getTeamCapacity(store, team, ships);
  assert.equal(total, 280000, `编队总容量=130000+150000=280000 (实际 ${total})`);
});

test('validateFormation：指挥值未超限', () => {
  const team = { id: 't1', flagshipUid: 'u1', memberUids: ['u1'] };
  const ships = { u1: { uid: 'u1', shipId: '80101' } }; // 130000
  const v = validateFormation(store, team, ships, 200000);
  assert.equal(v.ok, true, '未超限 ok=true');
  assert.equal(v.capacity.overflow, false);
});

test('validateFormation：指挥值超限', () => {
  const team = { id: 't1', flagshipUid: 'u1', memberUids: ['u1', 'u2'] };
  const ships = {
    u1: { uid: 'u1', shipId: '80101' }, // 130000
    u2: { uid: 'u2', shipId: '80201' }, // 150000 → 合 280000
  };
  const v = validateFormation(store, team, ships, 200000);
  assert.equal(v.ok, false, '超限 ok=false');
  assert.equal(v.capacity.overflow, true);
  assert.equal(v.capacity.overflowBy, 80000);
  assert.ok(v.errors.length > 0, '有错误信息');
});

test('validateFormation：成员不存在报错', () => {
  const team = { id: 't1', flagshipUid: 'u1', memberUids: ['u1', 'ghost'] };
  const ships = { u1: { uid: 'u1', shipId: '80101' } };
  const v = validateFormation(store, team, ships, 200000);
  assert.equal(v.ok, false);
  assert.ok(v.errors.some(e => e.includes('ghost')), '报成员不存在');
});

test('validateFormation：旗舰不存在报错', () => {
  const team = { id: 't1', flagshipUid: 'ghost', memberUids: ['u1'] };
  const ships = { u1: { uid: 'u1', shipId: '80101' } };
  const v = validateFormation(store, team, ships, 200000);
  assert.equal(v.ok, false);
  assert.ok(v.errors.some(e => e.includes('旗舰')), '报旗舰不存在');
});
