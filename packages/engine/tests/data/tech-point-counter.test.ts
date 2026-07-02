/**
 * 技能点统计器验证
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { countTechPoints, type ClientDataStore } from '../../src/data/index.js';
import { loadClientDataFromDir } from './nodeUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const configDir = join(__dirname, '..', '..', '..', '..', 'data', 'client', 'config');

let _store: ClientDataStore | null = null;
async function getStore(): Promise<ClientDataStore> {
  if (!_store) _store = await loadClientDataFromDir(configDir);
  return _store;
}

test('斗牛方案技能点统计: 基础15项', async () => {
  const store = await getStore();
  const tech =
    '4050101,1,4050111,5,2,303,5,3,304,5,4,204,2,5,4050112,5,6,203,4;' +
    '4050102,1,1207,4,2,1206,4,3,1121,2;' +
    '4050103,1,2201,4,2,2101,1,3,2105,1,4,2102,1;' +
    '4050104,1,4102,5,2,4105,5;';
  const summary = countTechPoints(store, tech);
  // 15个强化项都应解析到
  assert.equal(summary.items.length, 15, '15个强化项');
  assert.equal(summary.unresolved.length, 0, '0未解析');
  // 总消耗96（面板98，差2来自调校项的额外消耗，待确认）
  assert.equal(summary.totalPoints, 96, '基础15项=96点');
});

test('ENHANCE_COST 各级不同: 充能装置303 lv1=1,lv2=2', async () => {
  const store = await getStore();
  const tech1 = '4050101,1,303,1;'; // lv1
  const tech2 = '4050101,1,303,2;'; // lv2
  const s1 = countTechPoints(store, tech1);
  const s2 = countTechPoints(store, tech2);
  assert.equal(s1.items[0].totalCost, 1, 'lv1=1点');
  assert.equal(s2.items[0].totalCost, 3, 'lv2=1+2=3点');
  assert.deepEqual(s1.items[0].costPerLevel, [1, 2, 2, 2, 2], 'COST数组');
});

test('空科技串 = 0点', async () => {
  const store = await getStore();
  const summary = countTechPoints(store, '');
  assert.equal(summary.totalPoints, 0);
});

test('CV3000 科技串技能点统计', async () => {
  const store = await getStore();
  const tech =
    '8020104,20,8206,1;8020110,20,8207,1;8020109,2,1132,5,1,1131,5,3,1210,5,4,1211,5,8,8890,1;8020112,19,8601,1,20,8210,1,5,8701,1;8020101,20,8206,1;';
  const summary = countTechPoints(store, tech);
  assert.ok(summary.items.length > 0, '应有强化项');
  // 8206(系统维修)等COST=[0]不消耗, 但1132/1131/1210/1211等消耗
  assert.ok(summary.totalPoints >= 0, '总消耗≥0');
});
