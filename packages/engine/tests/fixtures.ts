/**
 * 测试夹具：构造舰船/武器样本，避免测试里重复样板代码。
 * 数据为手写的代表性数值，非真实战报（待 MVP-2 校准对齐）。
 */
import type { Ship, WeaponSystem, Fleet, Cell } from '../src/types/index.js';

export function cell(side: Cell['side'], row: Cell['row'], col = 1): Cell {
  return { side, row, col };
}

/** 构造武器，缺省字段用合理默认值 */
export function makeWeapon(over: Partial<WeaponSystem> & Pick<WeaponSystem, 'id'>): WeaponSystem {
  return {
    name: over.id,
    damageType: 'kinetic',
    delivery: 'direct',
    dph: 100,
    shotsPerCycle: 1,
    fireDuration: 0,
    cooldown: 1,
    baseHit: { destroyer: 0.8 },
    // 不设默认 critRate：游戏没有基础暴击率，需明确指定才有
    critMultiplier: 2.0,
    structure: 1000,
    ...over,
  };
}

/** 构造舰船，缺省字段用合理默认值 */
export function makeShip(over: Partial<Ship> & Pick<Ship, 'id' | 'cell'>): Ship {
  return {
    name: over.id,
    class: 'destroyer',
    structure: 30000,
    resistance: 10, // 标准抵抗值（面板火力基准）
    shield: 0, // 护盾减伤系数（0=无护盾）。能量伤害 = dph×(1−shield)
    dodge: 0,
    weapons: [],
    ...over,
  };
}

export function makeFleet(ships: Ship[]): Fleet {
  return { ships };
}
