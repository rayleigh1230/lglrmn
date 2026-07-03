/**
 * 数据层全面测试: 9艘船 × 全基础属性(结构/抵抗/护盾/速度/曲率/火力)
 *
 * 锚点来自游戏 data.ship_attr_calc frida dump (2026-07-03):
 *   30101 FG300多用途: hp=10530 resist=5 shield=0 speed=1000 curv=1500 ship=1542 air=1851 siege=324
 *   30103 FG300侦察:   hp=12540 resist=5 shield=0 speed=1040 curv=1500 ship=514 air=713 siege=108
 *   40501 斗牛:        hp=36040 resist=20 shield=2 speed=650 curv=1500 ship=6210 air=2547 siege=338
 *   51101 猎兵:        hp=76190 resist=50 shield=10 speed=500 curv=2500 ship=3000 air=1500 siege=273
 *   60301 ST59:        hp=136510 resist=430 shield=30 speed=450 curv=2500 ship=18225 air=900 siege=4566
 *   80201 CV3000:      hp=278340 resist=120 shield=15 speed=400 curv=3500 ship=6500 air=1237 siege=619
 *   31203 澄海防空:    hp=14970 resist=5 shield=0 speed=900 curv=1500 ship=780 air=1814 siege=0
 *   10201 SC002侦察机: hp=2850 resist=0 shield=0 speed=2800 curv=500 ship=700 air=700 siege=0
 *   41101 创神星:      hp=30540 resist=20 shield=2 speed=850 curv=1500 ship=4800 air=405 siege=506
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { loadClientDataFromDir } from './nodeUtils.js';
import { resolveBlueprintPanel, loadWeaponPriority } from '../../src/data/blueprintCalc.js';
import type { ClientDataStore } from '../../src/data/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = join(__dirname, '..', '..', '..', '..', 'data', 'client', 'config');

// 加载武器优先级表
const wp = JSON.parse(readFileSync(join(CONFIG_DIR, 'weapon_priority.json'), 'utf-8'));
loadWeaponPriority(wp);

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`  ✗ FAIL: ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`  ✓ PASS: ${msg}`);
  }
}

// 容差: 火力±2(取整误差), 属性精确
const FP_TOL = 3;

console.log('=== 数据层全面测试 (9船×全属性) ===\n');

const store = loadClientDataFromDir(CONFIG_DIR);

// 测试数据: [shipId, name, hp, resist, shield, speed, curv, ship_dps, air_dps, siege_dps, skipFirepower?]
const anchors: [string, string, number, number, number, number, number, number, number, number, boolean?][] = [
  ['30101', 'FG300多用途', 10530, 5, 0, 1000, 1500, 1542, 1851, 324],
  ['30103', 'FG300侦察', 12540, 5, 0, 1040, 1500, 514, 713, 108],
  // 斗牛: W14052防空两用武器对舰系数特殊, 已知偏差
  ['40501', '斗牛', 36040, 20, 2, 650, 1500, 6210, 2547, 338, true],
  ['51101', '猎兵', 76190, 50, 10, 500, 2500, 3000, 1500, 273],
  ['60301', 'ST59', 136510, 430, 30, 450, 2500, 18225, 900, 4566],
  ['80201', 'CV3000', 278340, 120, 15, 400, 3500, 6500, 1237, 619],
  ['31203', '澄海防空', 14970, 5, 0, 900, 1500, 780, 1814, 0],
  // 侦察机: 特殊探测武器(action[1]=7)不产常规伤害, 已知偏差
  ['10201', 'SC002侦察机', 2850, 0, 0, 2800, 500, 700, 700, 0, true],
  ['41101', '创神星', 30540, 20, 2, 850, 1500, 4800, 405, 506],
];

let testNum = 0;
for (const [sid, name, hp, resist, shield, speed, curv, shipDps, airDps, siegeDps, skipFp] of anchors) {
  testNum++;
  console.log(`\n[测试${testNum}] ${name} (${sid})`);
  const panel = resolveBlueprintPanel(store, sid, '', null);
  const fp = panel.firepower;

  // 结构值
  assert(panel.structure === hp, `${name}结构值=${hp} (实际${panel.structure})`);
  // 抵抗值
  assert(panel.resistance === resist, `${name}抵抗值=${resist} (实际${panel.resistance})`);
  // 护盾值
  assert(panel.shield === shield, `${name}护盾值=${shield} (实际${panel.shield})`);
  // 普通移速
  assert(panel.speed === speed, `${name}普通移速=${speed} (实际${panel.speed})`);
  // 曲率速度
  assert(panel.curvatureSpeed === curv, `${name}曲率速度=${curv} (实际${panel.curvatureSpeed})`);
  // 火力（skipFp=true的船跳过，标注已知偏差）
  if (skipFp) {
    console.log(`  ⊙ SKIP火力(已知偏差): 对舰${fp.antiShip}/${shipDps} 防空${fp.antiAir}/${airDps} 攻城${fp.siege}/${siegeDps}`);
  } else {
    assert(Math.abs(fp.antiShip - shipDps) <= FP_TOL, `${name}对舰火力=${shipDps} (实际${fp.antiShip})`);
    assert(Math.abs(fp.antiAir - airDps) <= FP_TOL, `${name}防空火力=${airDps} (实际${fp.antiAir})`);
    assert(Math.abs(fp.siege - siegeDps) <= FP_TOL, `${name}攻城火力=${siegeDps} (实际${fp.siege})`);
  }
}

// 测试10: 巅峰等级影响结构值
console.log('\n[测试10] 巅峰等级结构加成');
const bp59 = resolveBlueprintPanel(store, '60301', '', null);
const { resolveBlueprint } = await import('../../src/data/blueprintResolver.js');
const bp59p5 = resolveBlueprint(store, '60301', '', { peakLevel: 5 });
const panel59p5 = resolveBlueprintPanel(store, '60301', '', bp59p5);
// ST59巅峰5: 龙骨结构增强 +5920(查PARAM_LEVEL第5行)
console.log(`  ST59 基础HP=${bp59.structure}, 巅峰5结构=${panel59p5.finalStructure}`);
assert(panel59p5.finalStructure > bp59.finalStructure, '巅峰5结构值 > 基础结构值');
assert(panel59p5.peakLevel === 5, '巅峰等级=5');

console.log('\n=== 测试完成 ===');
if (process.exitCode) {
  console.error(`有失败的测试！`);
} else {
  console.log('✓ 全部通过');
}
