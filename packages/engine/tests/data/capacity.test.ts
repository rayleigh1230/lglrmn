/**
 * 指挥值校验（单舰值取 cfg_ship[7]，舰队值逐船求和 + 上限校验）
 *
 * 指挥值 = cfg_ship[7]（SHIP.COMMAND），白名单值域 1-55，按舰种递增：
 *   80101 太阳鲸 [7]=55 / 80201 CV3000 [7]=40 / 48101 灼热级 [7]=15
 *   60501 乌拉诺斯之矛 [7]=35 / 10320 载机 [7]=0 / 舰队上限 300-420
 *
 * 注意：cfg_ship[13]（EXPLOIT_CAPACITY）是开采/驻泊容量（航母 11 万-15 万），
 * 不是游戏指挥值。交接提交 7ad524d 曾误用 [13]，已回滚到 [7]。
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

test('cfg_ship[7] 是指挥值（COMMAND），非 [13]（EXPLOIT_CAPACITY 开采容量）', () => {
  // 太阳鲸 [7]=55, [13]=130000；CV3000 [7]=40, [13]=150000
  const ty = store.ship['80101'] as unknown[];
  const cv = store.ship['80201'] as unknown[];
  assert.equal(Number(ty[SHIP.COMMAND]), 55, '太阳鲸指挥值[7]=55');
  assert.equal(Number(cv[SHIP.COMMAND]), 40, 'CV3000指挥值[7]=40');
  assert.notEqual(Number(ty[SHIP.EXPLOIT_CAPACITY]), 55, '[13]≠指挥值，[13]是开采容量');
});

test('getShipCapacity：航母指挥值', () => {
  assert.equal(getShipCapacity(store, '80101'), 55, '太阳鲸指挥值=55');
  assert.equal(getShipCapacity(store, '80201'), 40, 'CV3000指挥值=40');
});

test('getShipCapacity：护卫级指挥值', () => {
  // 护卫舰指挥值 3-8 范围
  const cap = getShipCapacity(store, '48101'); // 灼热级 TE 重型火炮突击舰
  assert.equal(cap, 15, `灼热级指挥值=15 (实际 ${cap})`);
});

test('getShipCapacity：战机/无人机指挥值=0', () => {
  // 战机/无人机 ship_type=1/2，[7]=0（载机不占编队指挥值）
  const cap = getShipCapacity(store, '10320'); // IS-1型-无人机
  assert.equal(cap, 0, `载机 10320 指挥值=0 (实际 ${cap})`);
});

test('getShipCapacity：不存在 shipId 返回 0', () => {
  assert.equal(getShipCapacity(store, '99999'), 0);
});

test('getShipCapacity：含模块容量加成（EID=2034）', () => {
  // 模块容量效果 EID=2034。验证带 2034 模块的船容量 ≥ 基础指挥值。
  const cap60501 = getShipCapacity(store, '60501');
  const base60501 = Number((store.ship['60501'] as unknown[])[SHIP.COMMAND]);
  assert.ok(cap60501 >= base60501, `含模块加成后指挥值(${cap60501}) ≥ 基础(${base60501})`);
});

test('getTeamCapacity：编队聚合', () => {
  const team = {
    id: 't1', flagshipUid: 'u1', memberUids: ['u1', 'u2'],
    name: 'test', type: '0',
  };
  const ships = {
    u1: { uid: 'u1', shipId: '80101' },  // 太阳鲸 55
    u2: { uid: 'u2', shipId: '80201' },  // CV3000 40
  };
  const total = getTeamCapacity(store, team, ships);
  assert.equal(total, 95, `编队总指挥值=55+40=95 (实际 ${total})`);
});

test('validateFormation：指挥值未超限', () => {
  const team = { id: 't1', flagshipUid: 'u1', memberUids: ['u1'] };
  const ships = { u1: { uid: 'u1', shipId: '80101' } }; // 55
  const v = validateFormation(store, team, ships, 420); // 舰队上限量级
  assert.equal(v.ok, true, '未超限 ok=true');
  assert.equal(v.capacity.overflow, false);
});

test('validateFormation：指挥值超限', () => {
  const team = { id: 't1', flagshipUid: 'u1', memberUids: ['u1', 'u2'] };
  const ships = {
    u1: { uid: 'u1', shipId: '80101' }, // 55
    u2: { uid: 'u2', shipId: '80201' }, // 40 → 合 95
  };
  const v = validateFormation(store, team, ships, 80); // 用小 cap 测校验逻辑
  assert.equal(v.ok, false, '超限 ok=false');
  assert.equal(v.capacity.overflow, true);
  assert.equal(v.capacity.overflowBy, 15);
  assert.ok(v.errors.length > 0, '有错误信息');
});

test('validateFormation：成员不存在报错', () => {
  const team = { id: 't1', flagshipUid: 'u1', memberUids: ['u1', 'ghost'] };
  const ships = { u1: { uid: 'u1', shipId: '80101' } };
  const v = validateFormation(store, team, ships, 420);
  assert.equal(v.ok, false);
  assert.ok(v.errors.some(e => e.includes('ghost')), '报成员不存在');
});

test('validateFormation：旗舰不存在报错', () => {
  const team = { id: 't1', flagshipUid: 'ghost', memberUids: ['u1'] };
  const ships = { u1: { uid: 'u1', shipId: '80101' } };
  const v = validateFormation(store, team, ships, 420);
  assert.equal(v.ok, false);
  assert.ok(v.errors.some(e => e.includes('旗舰')), '报旗舰不存在');
});
