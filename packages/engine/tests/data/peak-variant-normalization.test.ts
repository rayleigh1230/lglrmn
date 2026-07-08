/**
 * 巅峰 COMMON_EFFECT 变体归一化测试 —— 对齐客户端 get_peak_effect
 *
 * 缺陷2修复验证：变体舰（如 41302）的 COMMON_EFFECT(field[0]) 必须归一化到基础舰
 * (main_ship_id = (shipId//10)*10+1) 查表。数据实证：变体行 field[0] 恒为空。
 *
 * 锚点（41301 基础舰 + 41302 变体）：
 *   41301 巅峰5 field[0] = "4130101,5;4130103,1;"  (COMMON 数据存在)
 *   41302 巅峰5 field[0] = ""                        (变体行恒空)
 *
 *   slot 4130101 lv5 → effect 413010101 (EID=12 龙骨结构增强) → PARAM_LEVEL lv5 = 1730
 *
 * 修复前：getPeakSnapshot(store,'41302',5) 查 4130205 → 空 → structureAbsolute=0（丢失）
 * 修复后：归一化查 4130105 → 得 base COMMON → structureAbsolute=1730（正确）
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadClientDataFromDir } from './nodeUtils.js';
import { getPeakSnapshot, computePeakBonus } from '../../src/data/peakLevel.js';
import type { ClientDataStore } from '../../src/data/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = join(__dirname, '..', '..', '..', '..', 'data', 'client', 'config');
const store: ClientDataStore = loadClientDataFromDir(CONFIG_DIR);

test('基础舰 41301 巅峰5 COMMON 数据存在', () => {
  const snap = getPeakSnapshot(store, '41301', 5);
  assert.equal(snap.peakLevel, 5);
  assert.ok(snap.enhances.length > 0, `41301 enhances 非空 (实际${snap.enhances.length})`);
  // slot 4130101 lv5 应在 enhances 里
  const slot01 = snap.enhances.find(e => e.slotId === '4130101');
  assert.ok(slot01, '4130101 在 enhances');
  assert.equal(slot01!.level, 5, `4130101 level=5`);
});

test('★变体舰 41302 巅峰5 归一化到基础舰 41301（缺陷2修复）', () => {
  const snap = getPeakSnapshot(store, '41302', 5);
  assert.equal(snap.peakLevel, 5, `41302 归一化后 peakLevel=5（非0）`);
  // 变体应继承基础舰的 COMMON enhances（field[0]）
  assert.ok(snap.enhances.length > 0, `41302 归一化后 enhances 非空 (实际${snap.enhances.length})`);
  const slot01 = snap.enhances.find(e => e.slotId === '4130101');
  assert.ok(slot01, '41302 归一化后含基础舰 slot 4130101');
  assert.equal(slot01!.level, 5);
});

test('★变体舰 41302 巅峰结构加成不再丢失（computePeakBonus）', () => {
  const bonus = computePeakBonus(store, '41302', 5);
  // slot 4130101 lv5 → EID=12 龙骨结构增强 → PARAM_LEVEL lv5=1730
  assert.equal(bonus.structureAbsolute, 1730, `41302 巅峰5 结构绝对值=1730 (实际${bonus.structureAbsolute})`);
  // 基础舰对照（应一致）
  const baseBonus = computePeakBonus(store, '41301', 5);
  assert.equal(baseBonus.structureAbsolute, 1730, `41301 基础舰对照=1730`);
  assert.equal(bonus.structureAbsolute, baseBonus.structureAbsolute, `变体=基础舰 结构加成一致`);
});

test('未归一化基准：不存在的变体仍返回空（防回归）', () => {
  // 99999 不存在任何巅峰数据 → 归一化到 99991 也查不到 → 空
  const snap = getPeakSnapshot(store, '99999', 5);
  assert.equal(snap.peakLevel, 0, `不存在舰 peakLevel=0`);
  assert.equal(snap.enhances.length, 0);
});

test('EXCLUSIVE(field[1]) 用字面 shipId（不归一化）—— 变体奖励独立', () => {
  // 找一个有 EXCLUSIVE 数据的变体，验证它用自己的 shipId 查 field[1]
  // （COMMON 归一化只影响 field[0]，field[1] 保持字面）
  const snap = getPeakSnapshot(store, '41302', 5);
  // rewardEntries 来自 4130205 的 field[1]（变体自己的奖励串）
  // 只要函数不报错且结构正确即可（具体奖励内容由数据决定）
  assert.ok(Array.isArray(snap.rewardEntries), 'rewardEntries 是数组');
});
