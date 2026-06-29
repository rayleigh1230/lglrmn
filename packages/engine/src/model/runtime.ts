/**
 * 运行时实体模型
 *
 * 区分"静态蓝图数据"（types/Ship、不可变）与"运行时可变状态"（RuntimeShip）。
 * 仿真过程中只修改运行时状态，蓝图数据保持不变，便于：
 *  - 多次复现（同一编队可重跑）
 *  - 对比战前/战后
 */
import type { Ship, WeaponSystem, Fleet } from '../types/index.js';

/** 武器运行时状态 */
export class RuntimeWeapon {
  readonly def: WeaponSystem;
  /** 子系统当前结构值（归零则失能，docs §7） */
  structure: number;
  /** 是否已失能 */
  disabled = false;

  constructor(def: WeaponSystem) {
    this.def = def;
    this.structure = def.structure;
  }

  /** 扣减结构值，归零则失能 */
  takeDamage(amount: number): boolean {
    if (this.disabled) return false;
    this.structure = Math.max(0, this.structure - amount);
    if (this.structure <= 0) {
      this.disabled = true;
      return true; // 本次伤害导致失能
    }
    return false;
  }
}

/** 舰船运行时状态 */
export class RuntimeShip {
  readonly def: Ship;
  /** 本体当前结构值 */
  structure: number;
  /** 是否已被摧毁 */
  destroyed = false;
  /** 武器运行时状态 */
  weapons: RuntimeWeapon[];

  constructor(def: Ship) {
    this.def = def;
    this.structure = def.structure;
    this.weapons = def.weapons.map((w) => new RuntimeWeapon(w));
  }

  /** 获取未失能的武器（仍可开火） */
  activeWeapons(): RuntimeWeapon[] {
    return this.weapons.filter((w) => !w.disabled);
  }

  /** 扣减本体结构值，归零则标记摧毁 */
  takeDamage(amount: number): boolean {
    if (this.destroyed) return false;
    this.structure = Math.max(0, this.structure - amount);
    if (this.structure <= 0) {
      this.destroyed = true;
      return true; // 本次伤害导致击沉
    }
    return false;
  }
}

/** 编队运行时状态 */
export class RuntimeFleet {
  readonly ships: RuntimeShip[];

  constructor(fleet: Fleet) {
    this.ships = fleet.ships.map((s) => new RuntimeShip(s));
  }

  /** 仍存活的舰船 */
  aliveShips(): RuntimeShip[] {
    return this.ships.filter((s) => !s.destroyed);
  }

  /** 是否还有存活舰船 */
  hasAlive(): boolean {
    return this.aliveShips().length > 0;
  }
}
