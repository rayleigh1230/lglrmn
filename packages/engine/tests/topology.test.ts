/**
 * 拓扑关系判定测试
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sameCell, sameRow, sameSide, anywhere, isOpposing, inScope, cellKey } from '../src/topology/index.js';
import { cell } from './fixtures.js';

test('sameCell: 同格判定', () => {
  assert.equal(sameCell(cell('ally', 'front', 1), cell('ally', 'front', 1)), true);
  assert.equal(sameCell(cell('ally', 'front', 1), cell('ally', 'front', 2)), false); // 不同列
  assert.equal(sameCell(cell('ally', 'front', 1), cell('enemy', 'front', 1)), false); // 不同阵营
  assert.equal(sameCell(cell('ally', 'front', 1), cell('ally', 'middle', 1)), false); // 不同排
});

test('sameRow: 同排判定（同阵营同排，列可不同）', () => {
  assert.equal(sameRow(cell('ally', 'middle', 1), cell('ally', 'middle', 3)), true);
  assert.equal(sameRow(cell('ally', 'middle', 1), cell('enemy', 'middle', 1)), false); // 不同阵营
  assert.equal(sameRow(cell('ally', 'front', 1), cell('ally', 'rear', 1)), false); // 不同排
});

test('sameSide: 同阵营判定', () => {
  assert.equal(sameSide(cell('ally', 'front', 1), cell('ally', 'rear', 9)), true);
  assert.equal(sameSide(cell('ally', 'front'), cell('enemy', 'front')), false);
});

test('anywhere: 恒真', () => {
  assert.equal(anywhere(cell('ally', 'front'), cell('enemy', 'rear')), true);
});

test('isOpposing: 对立阵营判定', () => {
  assert.equal(isOpposing(cell('ally', 'front'), cell('enemy', 'front')), true);
  assert.equal(isOpposing(cell('ally', 'front'), cell('ally', 'front')), false);
});

test('inScope: 四种拦截范围', () => {
  const defender = cell('ally', 'middle', 2);
  // sameCell
  assert.equal(inScope(defender, cell('ally', 'middle', 2), 'sameCell'), true);
  assert.equal(inScope(defender, cell('ally', 'middle', 3), 'sameCell'), false);
  // sameRow
  assert.equal(inScope(defender, cell('ally', 'middle', 5), 'sameRow'), true);
  assert.equal(inScope(defender, cell('ally', 'front', 2), 'sameRow'), false);
  // sameSide
  assert.equal(inScope(defender, cell('ally', 'front', 1), 'sameSide'), true);
  assert.equal(inScope(defender, cell('enemy', 'middle', 2), 'sameSide'), false);
  // anywhere
  assert.equal(inScope(defender, cell('enemy', 'rear', 9), 'anywhere'), true);
});

test('cellKey: 稳定字符串表示', () => {
  assert.equal(cellKey(cell('ally', 'front', 3)), 'ally:front:3');
});
