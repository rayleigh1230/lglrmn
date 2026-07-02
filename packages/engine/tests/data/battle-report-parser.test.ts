/**
 * 战报数据解析器验证（用真实 CV3000 战报）
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseTeamBattleData, parseEnemyBattleData, parseHpCurve } from '../../src/data/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const reportDir = join(__dirname, '..', '..', '..', '..', 'data', 'client', 'battle_report_today1');

test('CV3000 team 块0解析: ship_id + tech_str + enabled_slots', () => {
  const raw = readFileSync(join(reportDir, 'team_battle_data_decoded.txt'), 'utf-8');
  const teamData = eval(raw); // team 是数组字面量
  const configs = parseTeamBattleData(teamData);
  assert.equal(configs.length, 1, 'CV3000单船');
  const cv = configs[0];
  assert.equal(cv.shipId, '80201');
  assert.ok(cv.techString.length > 50, '科技串非空');
  assert.ok(cv.enabledSlots.includes('8020101'), '含启用模块');
});

test('混沌 enemy 块0解析', () => {
  const raw = readFileSync(join(reportDir, 'enemy_battle_data_decoded.txt'), 'utf-8');
  const enemyData = JSON.parse(raw);
  const configs = parseEnemyBattleData(enemyData);
  assert.ok(configs.length >= 1, '至少1艘');
  assert.equal(configs[0].shipId, '51201');
  assert.ok(configs[0].techString.length > 30, '科技串非空');
});

test('HP曲线解析: type=5常规/type=97击毁/type=99结束', () => {
  const raw = readFileSync(join(reportDir, 'enemy_battle_data_decoded.txt'), 'utf-8');
  const enemyData = JSON.parse(raw);
  const tid = Object.keys(enemyData)[0];
  const hpCurveStr = String(enemyData[tid][1]);
  const samples = parseHpCurve(hpCurveStr);
  assert.ok(samples.length > 200, '应有200+采样点');
  // 首点是常规采样
  assert.equal(samples[0].type, 5);
  assert.equal(samples[0].time, 0);
  assert.equal(samples[0].struct, 370192, '初始结构370192');
  // 末尾应有击毁(97)和结束(99)
  const types = samples.map((s) => s.type);
  assert.ok(types.includes(97), '有击毁事件');
  assert.ok(types.includes(99), '有结束事件');
});

test('HP曲线逐5秒间隔验证', () => {
  const raw = readFileSync(join(reportDir, 'enemy_battle_data_decoded.txt'), 'utf-8');
  const enemyData = JSON.parse(raw);
  const tid = Object.keys(enemyData)[0];
  const samples = parseHpCurve(String(enemyData[tid][1]));
  // type=5的采样应每5秒一个
  const regular = samples.filter((s) => s.type === 5);
  for (let i = 1; i < Math.min(10, regular.length); i++) {
    assert.equal(regular[i].time - regular[i - 1].time, 5, `第${i}个间隔应5秒`);
  }
});
