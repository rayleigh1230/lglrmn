/**
 * 超主力舰模块装配验证测试
 *
 * CV3000（航母）有 13 个子系统：6 固定 + 7 可选（分 3 组互斥）
 * 战报块0[12] = 启用的 slotId 清单
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { resolveAssembly, getEnabledSystemIds, type ClientDataStore } from '../../src/data/index.js';
import { loadClientDataFromDir } from './nodeUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const configDir = join(__dirname, '..', '..', '..', '..', 'data', 'client', 'config');

let _store: ClientDataStore | null = null;
async function getStore(): Promise<ClientDataStore> {
  if (!_store) _store = await loadClientDataFromDir(configDir);
  return _store;
}

test('CV3000 子系统总数 = 13（6固定 + 7可选）', async () => {
  const store = await getStore();
  // 战报[12]启用的: 01,04,09,10,11,12
  const result = resolveAssembly(store, '80201', '8020101,8020104,8020109,8020110,8020111,8020112');
  assert.equal(result.systems.length, 13, 'CV3000 应有13个子系统');
  const fixed = result.systems.filter((s) => s.isFixed);
  const optional = result.systems.filter((s) => s.isOptional);
  assert.equal(fixed.length, 6, '6个固定子系统');
  assert.equal(optional.length, 7, '7个可选模块');
});

test('CV3000 固定子系统始终启用', async () => {
  const store = await getStore();
  const result = resolveAssembly(store, '80201', '8020101'); // 只显式启用1个
  const fixed = result.systems.filter((s) => s.isFixed);
  for (const s of fixed) {
    assert.ok(s.enabled, `固定子系统 ${s.slot} ${s.name} 应始终启用`);
  }
});

test('CV3000 可选模块按装配清单启用', async () => {
  const store = await getStore();
  // 启用 02(综合战机) + 05(防空导弹)
  const result = resolveAssembly(store, '80201', '8020102,8020105');
  const sys02 = result.systems.find((s) => s.slot === '02');
  const sys05 = result.systems.find((s) => s.slot === '05');
  const sys03 = result.systems.find((s) => s.slot === '03'); // 同组未选
  assert.ok(sys02?.enabled, '02 综合战机应启用');
  assert.ok(sys05?.enabled, '05 防空导弹应启用');
  assert.ok(!sys03?.enabled, '03 大型舰载机应未启用');
});

test('CV3000 GROUP 互斥校验（同组多选报错）', async () => {
  const store = await getStore();
  // 同组101启用02+03（违规）
  const result = resolveAssembly(store, '80201', '8020102,8020103');
  assert.ok(result.errors.length > 0, '应有GROUP互斥错误');
  const err = result.errors.find((e) => e.group === 101);
  assert.ok(err, 'GROUP 101 应报互斥冲突');
  assert.ok(err!.conflictingSlots.includes('02'));
  assert.ok(err!.conflictingSlots.includes('03'));
});

test('CV3000 GROUP 合法选择不报错', async () => {
  const store = await getStore();
  // GROUP101选02, GROUP102选05, GROUP201选07（各选一个，合法）
  const result = resolveAssembly(store, '80201', '8020102,8020105,8020107');
  assert.equal(result.errors.length, 0, '各GROUP选一个应无错误');
});

test('CV3000 启用系统ID列表（用于科技串过滤）', async () => {
  const store = await getStore();
  const result = resolveAssembly(store, '80201', '8020102,8020105');
  const enabled = getEnabledSystemIds(result);
  // 固定6个 + 可选2个 = 8个
  assert.ok(enabled.length >= 6, '至少含6个固定');
  assert.ok(enabled.includes('8020102'), '含02综合战机');
  assert.ok(enabled.includes('8020105'), '含05防空导弹');
});

test('斗牛级（主力舰）无可选模块，全部固定', async () => {
  const store = await getStore();
  const result = resolveAssembly(store, '40501', '');
  const optional = result.systems.filter((s) => s.isOptional);
  assert.equal(optional.length, 0, '斗牛应无可选模块');
  // 全部启用
  for (const s of result.systems) {
    assert.ok(s.enabled, `${s.slot} 应启用`);
  }
});
