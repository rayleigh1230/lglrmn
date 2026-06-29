/**
 * 全场景引擎验证 —— 把所有实测配置完整放进引擎跑,不漏任何值
 *
 * 6组场景,攻击方击毁FG300,记录FG300反击伤害 + 战斗时长。
 * 引擎当前公式:
 *   命中: base×(1−dodge),base为面板命中率(区间roll)
 *   实弹: max(dph−resistance, dph×10%)
 *   能量: dph×(1−shield)
 *   暴击: critRate默认0
 *
 * 每组跑N场蒙特卡洛,看时长/伤害分布是否覆盖实测。
 *
 * 用法：npx tsx tests/full-engine-validate.ts
 */
import { simulate, createRNG } from '../src/index.js';
import { makeWeapon, makeShip, makeFleet, cell } from './fixtures.js';

function quantile(s: number[], p: number): number {
  const idx = (s.length - 1) * p; const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return s[lo];
  return s[lo] + (s[hi] - s[lo]) * (idx - lo);
}

// FG300反击武器(固定):3门 dph30/3发/持续3s/冷却4/锁定3/对驱逐舰命中50-70%
// 注意:FG300对不同class的命中率可能不同,这里先全用50-70%
function fg300Weapons() {
  const mk = (id: string) => makeWeapon({
    id, dph: 30, shotsPerCycle: 3, fireDuration: 3, cooldown: 4, lockOnTime: 3,
    baseHit: { destroyer: { min: 0.5, max: 0.7 }, frigate: { min: 0.5, max: 0.7 } },
    damageType: 'kinetic',
  });
  return [mk('fa'), mk('fb'), mk('fc')];
}

// FG300舰船定义:护盾2(对能量武器减2%),闪避8%,抵抗8
function fg300Ship() {
  return makeShip({
    id: 'FG300', cell: cell('enemy', 'front', 1), class: 'frigate',
    structure: 14263, resistance: 8, shield: 0, dodge: 0.08,
    weapons: fg300Weapons(),
  });
}

// 攻击方舰船构建器
interface AttackerSpec {
  id: string;
  class: 'destroyer' | 'frigate';
  structure: number;
  resistance: number;
  dodge: number;
  shield: number;
  weapons: ReturnType<typeof makeWeapon>[];
}

interface Scenario {
  name: string;
  attacker: AttackerSpec;
  observed: [number, number][]; // [时长s, 伤害]
}

const scenarios: Scenario[] = [
  // 1. 驱逐舰(闪避25%,抵抗36) — 第一组12场
  {
    name: '1.驱逐舰(闪避25%)',
    attacker: {
      id: '驱逐舰', class: 'destroyer', structure: 32707, resistance: 36, dodge: 0.25, shield: 0,
      weapons: Array.from({ length: 5 }, (_, i) => makeWeapon({
        id: `W${i}`, dph: 105, shotsPerCycle: 1, fireDuration: 0, cooldown: 6, lockOnTime: 3,
        baseHit: { frigate: { min: 0.5, max: 0.7 } }, damageType: 'kinetic',
      })),
    },
    observed: [
      [322, 591], [322, 579], [323, 573], [322, 579], [322, 669],
      [291, 567], [270, 531], [322, 633], [270, 564], [291, 546], [323, 648], [322, 678],
    ],
  },
  // 2. 亚达伯拉(闪避0%,抵抗45) — 9场
  {
    name: '2.亚达伯拉(闪避0%)',
    attacker: {
      id: '亚达伯拉', class: 'destroyer', structure: 40799, resistance: 45, dodge: 0, shield: 0,
      weapons: [
        ...Array.from({ length: 2 }, (_, i) => makeWeapon({
          id: `A1_${i}`, dph: 25, shotsPerCycle: 2, fireDuration: 1, cooldown: 5, lockOnTime: 3,
          baseHit: { frigate: { min: 0.5, max: 0.7 } }, damageType: 'kinetic',
        })),
        ...Array.from({ length: 3 }, (_, i) => makeWeapon({
          id: `A2_${i}`, dph: 400, shotsPerCycle: 2, fireDuration: 0, cooldown: 30, lockOnTime: 12,
          baseHit: { frigate: { min: 0.5, max: 0.7 } }, damageType: 'kinetic',
        })),
      ],
    },
    observed: [
      [232, 567], [253, 660], [294, 735], [232, 576], [253, 627], [294, 762],
      [232, 624], [253, 618], [295, 765],
    ],
  },
  // 3. 斗牛能量武器(闪避8%,抵抗36) — 12场
  {
    name: '3.斗牛能量(闪避8%)',
    attacker: {
      id: '斗牛8', class: 'destroyer', structure: 42107, resistance: 36, dodge: 0.08, shield: 0,
      weapons: [
        makeWeapon({
          id: 'B1', dph: 455, shotsPerCycle: 1, fireDuration: 0, cooldown: 4.2, lockOnTime: 4,
          baseHit: { frigate: { min: 0.7, max: 1.0 } }, damageType: 'energy',
        }),
        ...Array.from({ length: 3 }, (_, i) => makeWeapon({
          id: `B2_${i}`, dph: 24, shotsPerCycle: 1, fireDuration: 0, cooldown: 3, lockOnTime: 3,
          baseHit: { frigate: { min: 0.5, max: 0.7 } }, damageType: 'energy',
        })),
      ],
    },
    observed: [
      [169, 402], [175, 411], [198, 492], [175, 396], [169, 384], [199, 471],
      [174, 390], [199, 399], [169, 384], [175, 378], [169, 387], [199, 423],
    ],
  },
  // 4. 斗牛能量武器(闪避16%,抵抗36) — 10场
  {
    name: '4.斗牛能量(闪避16%)',
    attacker: {
      id: '斗牛16', class: 'destroyer', structure: 42107, resistance: 36, dodge: 0.16, shield: 0,
      weapons: [
        makeWeapon({
          id: 'C1', dph: 455, shotsPerCycle: 1, fireDuration: 0, cooldown: 4.2, lockOnTime: 4,
          baseHit: { frigate: { min: 0.7, max: 1.0 } }, damageType: 'energy',
        }),
        ...Array.from({ length: 3 }, (_, i) => makeWeapon({
          id: `C2_${i}`, dph: 24, shotsPerCycle: 1, fireDuration: 0, cooldown: 3, lockOnTime: 3,
          baseHit: { frigate: { min: 0.5, max: 0.7 } }, damageType: 'energy',
        })),
      ],
    },
    observed: [
      [157, 354], [168, 351], [181, 384], [185, 402], [192, 393], [147, 336],
      [168, 360], [184, 384], [181, 378], [191, 393],
    ],
  },
  // 5. 阋神星(闪避41%,抵抗20) — 5场
  {
    name: '5.阋神星(闪避41%)',
    attacker: {
      id: '阋神星', class: 'destroyer', structure: 32787, resistance: 20, dodge: 0.41, shield: 0,
      weapons: [
        ...Array.from({ length: 3 }, (_, i) => makeWeapon({
          id: `X1_${i}`, dph: 42, shotsPerCycle: 1, fireDuration: 0, cooldown: 3, lockOnTime: 3,
          baseHit: { frigate: { min: 0.5, max: 0.7 } }, damageType: 'kinetic',
        })),
        makeWeapon({
          id: 'X2', dph: 315, shotsPerCycle: 2, fireDuration: 0, cooldown: 11, lockOnTime: 4,
          baseHit: { frigate: { min: 0.5, max: 0.7 } }, damageType: 'kinetic',
        }),
      ],
    },
    observed: [
      [251, 1250], [270, 1330], [261, 1330], [281, 1400], [280, 1460],
    ],
  },
  // 6. 卡利莱恩(闪避55%,抵抗8) — 2场
  {
    name: '6.卡利莱恩(闪避55%)',
    attacker: {
      id: '卡利莱恩', class: 'frigate', structure: 10418, resistance: 8, dodge: 0.55, shield: 0,
      weapons: [
        ...Array.from({ length: 2 }, (_, i) => makeWeapon({
          id: `K1_${i}`, dph: 36, shotsPerCycle: 3, fireDuration: 3, cooldown: 5, lockOnTime: 3,
          baseHit: { frigate: { min: 0.5, max: 0.7 } }, damageType: 'kinetic',
        })),
        ...Array.from({ length: 2 }, (_, i) => makeWeapon({
          id: `K2_${i}`, dph: 10, shotsPerCycle: 1, fireDuration: 0, cooldown: 3, lockOnTime: 2,
          baseHit: { frigate: { min: 0.3, max: 0.5 } }, damageType: 'kinetic',
        })),
      ],
    },
    observed: [
      [1103, 9394], [1126, 9922],
    ],
  },
];

console.log('='.repeat(90));
console.log('全场景引擎验证(当前公式: base×(1−dodge), 无暴击, 区间roll)');
console.log('='.repeat(90));

const N = 300;
for (const sc of scenarios) {
  // 计算实测时长中位和伤害范围
  const obsTimes = sc.observed.map(o => o[0]).sort((a, b) => a - b);
  const obsDmgs = sc.observed.map(o => o[1]).sort((a, b) => a - b);
  const obsTimeMed = quantile(obsTimes, 0.5);
  const obsDmgMed = quantile(obsDmgs, 0.5);

  // 引擎跑N场:FG300反击伤害 + 战斗时长
  const fg300 = fg300Ship();
  const attacker = makeShip({
    id: sc.attacker.id, cell: cell('ally', 'front', 1), class: sc.attacker.class,
    structure: sc.attacker.structure, resistance: sc.attacker.resistance,
    dodge: sc.attacker.dodge, shield: sc.attacker.shield, weapons: sc.attacker.weapons,
  });

  const simDmgs: number[] = [];
  const simTimes: number[] = [];
  const maxT = Math.max(...obsTimes) * 2;
  for (let seed = 1; seed <= N; seed++) {
    const r = simulate(makeFleet([attacker]), makeFleet([fg300]), { maxTime: maxT, rng: createRNG(seed) });
    // FG300反击伤害 = FG300对攻击方造成的伤害 = 攻击方掉血
    const atkSurv = r.survivors.ally.find(s => s.shipId === sc.attacker.id);
    const fgDmg = sc.attacker.structure - (atkSurv ? atkSurv.structure : 0);
    simDmgs.push(fgDmg);
    simTimes.push(r.duration);
  }
  simDmgs.sort((a, b) => a - b);
  simTimes.sort((a, b) => a - b);

  console.log(`\n【${sc.name}】 ${sc.observed.length}场实测, ${N}场模拟`);
  console.log(`  攻击方: ${sc.attacker.id} ${sc.attacker.class} 抵抗${sc.attacker.resistance} 闪避${(sc.attacker.dodge*100).toFixed(0)}%`);
  console.log(`  伤害: 实测中位${obsDmgMed} 范围[${obsDmgs[0]},${obsDmgs[obsDmgs.length-1]}]`);
  console.log(`        模拟中位${quantile(simDmgs,0.5).toFixed(0)} P10-P90[${quantile(simDmgs,0.1).toFixed(0)},${quantile(simDmgs,0.9).toFixed(0)}]`);
  console.log(`        偏差 ${obsDmgMed > quantile(simDmgs,0.5) ? '+' : ''}${((obsDmgMed - quantile(simDmgs,0.5))/quantile(simDmgs,0.5)*100).toFixed(1)}%`);
  console.log(`  时长: 实测中位${obsTimeMed}s 范围[${obsTimes[0]},${obsTimes[obsTimes.length-1]}]`);
  console.log(`        模拟中位${quantile(simTimes,0.5).toFixed(0)}s P10-P90[${quantile(simTimes,0.1).toFixed(0)},${quantile(simTimes,0.9).toFixed(0)}]`);
  console.log(`        偏差 ${obsTimeMed > quantile(simTimes,0.5) ? '+' : ''}${((obsTimeMed - quantile(simTimes,0.5))/quantile(simTimes,0.5)*100).toFixed(1)}%`);
}
console.log('\n' + '='.repeat(90));
