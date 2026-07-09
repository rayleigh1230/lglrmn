/**
 * 火力公式锚点校验
 *
 * 验证 computeFirepower 与游戏 data.ship_attr_calc dump 值一致。
 * 运行：cd packages/engine && npx tsx tests/data/firepower-anchor.ts
 *
 * 锚点（frida dump 自游戏运行时，2026-07-03）：
 *   FG300(30101) 主炮13011: 对舰=1542 防空=1851 攻城=324
 *   ST59(60301) 武器16031: 对舰=10350 攻城=3360 (无防空)
 *   ST59(60301) 武器15017: 对舰=1800 防空=900 攻城=72
 *   ST59(60301) 武器16033: 对舰=6075 攻城=1134 (无防空)
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { loadClientDataFromDir } from './nodeUtils.js';
import { resolveShipWeapons, computeFirepower, loadWeaponPriority } from '../../src/data/blueprintCalc.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CONFIG_DIR = join(__dirname, '..', '..', '..', '..', 'data', 'client', 'config');

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`  ✗ FAIL: ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`  ✓ PASS: ${msg}`);
  }
}

console.log('=== 火力公式锚点校验 ===\n');

const store = loadClientDataFromDir(CONFIG_DIR);

// ★加载武器优先级表（决定 canTargetShip/Air/Destroy，不调则全 false → 火力全 0）
const wp = JSON.parse(readFileSync(join(CONFIG_DIR, 'weapon_priority.json'), 'utf-8'));
loadWeaponPriority(wp);

// FG300: 全船火力（只有主炮13011贡献，resolveShipWeapons装配正确）
console.log('[FG300 / 30101]');
const fgWeapons = resolveShipWeapons(store, '30101');
console.log('  武器数:', fgWeapons.length, '明细:', fgWeapons.map(w => ({ id: w.weaponId, act0: w.attackRounds, dph: w.dph, install: w.installNum, dc: w.destroyCoef, aa: w.antiaircraftRatio })));
const fg = computeFirepower(fgWeapons, [], store);
console.log(`  对舰=${fg.antiShip} 防空=${fg.antiAir} 攻城=${fg.siege}`);
assert(fg.antiShip === 1542, `FG300对舰=1542 (dump锚点, 实际${fg.antiShip})`);
assert(fg.antiAir === 1851, `FG300防空=1851 (dump锚点, 实际${fg.antiAir})`);
assert(fg.siege === 324, `FG300攻城=324 (实际${fg.siege})`);

// 公式单武器验证：手动构造游戏 dump 确认的武器数据
// （resolveShipWeapons 装配全部 cat=1/2 武器，但游戏默认型号只装一部分，
//   所以用手动构造验证公式本身，装配逻辑另作）
console.log('\n[公式单武器验证 - 游戏dump锚点]');
type W = Parameters<typeof computeFirepower>[0][0];
function makeW(partial: Partial<W>): W {
  return {
    weaponId: '', systemId: '', systemLabel: '', slotId: '', shipType: 3,
    dph: 0, attackRounds: 1, attackCount: 1, installNum: 1, antiaircraftRatio: 0,
    shotsPerCycle: 1, fireDuration: 0, cooldown: 0, flightBefore: 0, flightAfter: 0,
    weaponType: 0, tmt: 0, actionType: 2, specialTargetLogic: 0,
    destroyCoef: 0, aircraftCoef: 0, airBaseBonus: 0, airCdSkillRatio: 0, airDurSkillRatio: 0,
    isAirborne: false, damageType: 'kinetic',
    canTargetShip: true, canTargetAircraft: false, canTargetDestroy: false,
    category: 'antiShip' as const,
    modDamageInc: 0, modAircraftInc: 0, modDestroyInc: 0,
    ...partial,
  };
}

// FG300主炮13011: ship=1542 air=1851 siege=324 (action=(3,2,30,1,3000), install=3, DC=14, AIRCRAFT_COEF=100, cd=4, airBaseBonus=50)
const w13011 = makeW({ dph: 30, attackRounds: 3, attackCount: 1, installNum: 3, fireDuration: 3, cooldown: 4, destroyCoef: 14, aircraftCoef: 100, antiaircraftRatio: 200, airBaseBonus: 50, canTargetShip: true, canTargetAircraft: true, canTargetDestroy: true });
const fp13011 = computeFirepower([w13011], [], store);
console.log(`  13011: 对舰=${fp13011.antiShip} 防空=${fp13011.antiAir} 攻城=${fp13011.siege}`);
assert(fp13011.antiShip === 1542, `13011对舰=1542 (dump锚点, 实际${fp13011.antiShip})`);
assert(fp13011.antiAir === 1851, `13011防空=1851 (dump锚点, 实际${fp13011.antiAir})`);
assert(fp13011.siege === 324, `13011攻城=324 (实际${fp13011.siege})`);

// ST59武器16031: ship=10350 siege=3360 (action=(1,2,700,2,0), install=2, DC=32, cd=16)
const w16031 = makeW({ dph: 700, attackRounds: 1, attackCount: 2, installNum: 2, fireDuration: 0, cooldown: 16, destroyCoef: 32, shipType: 6, canTargetShip: true, canTargetDestroy: true });
const fp16031 = computeFirepower([w16031], [], store);
console.log(`  16031: 对舰=${fp16031.antiShip} 攻城=${fp16031.siege}`);
assert(fp16031.antiShip === 10350, `16031对舰=10350 (实际${fp16031.antiShip})`);
assert(fp16031.siege === 3360, `16031攻城=3360 (实际${fp16031.siege})`);

// ST59武器15017: ship=1800 siege=72 (action=(1,2,40,1,0), install=4, DC=3, cd=4)
const w15017 = makeW({ dph: 40, attackRounds: 1, attackCount: 1, installNum: 4, fireDuration: 0, cooldown: 4, destroyCoef: 3, shipType: 6, canTargetShip: true, canTargetDestroy: true });
const fp15017 = computeFirepower([w15017], [], store);
console.log(`  15017: 对舰=${fp15017.antiShip} 攻城=${fp15017.siege}`);
assert(fp15017.antiShip === 1800, `15017对舰=1800 (实际${fp15017.antiShip})`);
assert(fp15017.siege === 72, `15017攻城=72 (实际${fp15017.siege})`);

// ST59武器16033: ship=6075 siege=1134 (action=(1,2,280,2,0), install=3, DC=18, cd=16)
const w16033 = makeW({ dph: 280, attackRounds: 1, attackCount: 2, installNum: 3, fireDuration: 0, cooldown: 16, destroyCoef: 18, shipType: 6, canTargetShip: true, canTargetDestroy: true });
const fp16033 = computeFirepower([w16033], [], store);
console.log(`  16033: 对舰=${fp16033.antiShip} 攻城=${fp16033.siege}`);
assert(fp16033.antiShip === 6075, `16033对舰=6075 (实际${fp16033.antiShip})`);
assert(fp16033.siege === 1134, `16033攻城=1134 (实际${fp16033.siege})`);

// 澄海级防空护卫舰31203 - 防空专用词条验证
console.log('\n[澄海级防空护卫舰 / 31203 - 防空专用词条]');
// W13124: air=1440 (action=(4,2,20,1,4000), install=2, aa=150, cd=6, airBaseBonus=60, airCdSkillRatio=-40, airDurSkillRatio=-40)
// 防空高速高效循环(EID=12306降CD40%) + 防空高效打击(EID=12311降dur40%)
// skill_ratio = INC−DEC = 0−40 = −40（数值等价旧 airCdReduction:40 的减法）
const w13124 = makeW({ dph: 20, attackRounds: 4, attackCount: 1, installNum: 2, fireDuration: 4, cooldown: 6, aircraftCoef: 100, antiaircraftRatio: 150, airBaseBonus: 60, airCdSkillRatio: -40, airDurSkillRatio: -40, canTargetShip: false, canTargetAircraft: true, canTargetDestroy: false });
const fp13124 = computeFirepower([w13124], [], store);
console.log(`  13124: 防空=${fp13124.antiAir}`);
assert(Math.abs(fp13124.antiAir - 1440) <= 1, `13124防空=1440 (实际${fp13124.antiAir})`);

// W13122: air=374 (action=(3,2,15,1,3000), install=2, aa=150, cd=3, airBaseBonus=10, airCdSkillRatio=-10, airDurSkillRatio=-10)
const w13122 = makeW({ dph: 15, attackRounds: 3, attackCount: 1, installNum: 2, fireDuration: 3, cooldown: 3, aircraftCoef: 100, antiaircraftRatio: 150, airBaseBonus: 10, airCdSkillRatio: -10, airDurSkillRatio: -10, canTargetShip: false, canTargetAircraft: true, canTargetDestroy: false });
const fp13122 = computeFirepower([w13122], [], store);
console.log(`  13122: 防空=${fp13122.antiAir}`);
assert(Math.abs(fp13122.antiAir - 375) <= 2, `13122防空≈375 (实际${fp13122.antiAir})`);

console.log('\n=== 校验完成 ===');
if (process.exitCode) {
  console.error('有失败的校验！');
} else {
  console.log('✓ 全部通过');
}
