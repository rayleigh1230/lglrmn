/**
 * 运行时实体模型
 *
 * 区分"静态蓝图数据"（types/Ship、不可变）与"运行时可变状态"（RuntimeShip）。
 * 仿真过程中只修改运行时状态，蓝图数据保持不变，便于：
 *  - 多次复现（同一编队可重跑）
 *  - 对比战前/战后
 */
import type { Ship, WeaponSystem, Fleet, TempBuff } from '../types/index.js';

/** 一个 buff 实例的运行时激活记录 */
interface ActiveBuffInst {
  /** 对应的 buff 定义 */
  def: TempBuff;
  /** 到期时刻（秒） */
  expiresAt: number;
}

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
  /** 当前激活的 buff 实例（含到期时刻） */
  private activeBuffs: ActiveBuffInst[] = [];
  /** threshold 类 buff 是否已触发过（避免重复触发） */
  private triggeredThresholds = new Set<string>();

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

  /**
   * 尝试触发 buff（由 simulator 在合适时机调用）。
   * - threshold：结构值低于阈值且未触发过时激活，记入已触发集合
   * - periodic：直接激活
   * 激活 = 加入 activeBuffs，到期时刻 = now + duration
   */
  tryActivateBuff(buff: TempBuff, now: number): boolean {
    if (buff.trigger.kind === 'threshold') {
      const threshold = this.def.structure * buff.trigger.hpFrac;
      if (this.structure > threshold) return false; // 还没到阈值
      if (this.triggeredThresholds.has(buff.id)) return false; // 已触发过
      this.triggeredThresholds.add(buff.id);
    }
    this.activeBuffs.push({ def: buff, expiresAt: now + buff.duration });
    return true;
  }

  /** 清理已到期的 buff（每次结算前调用） */
  expireBuffs(now: number): void {
    this.activeBuffs = this.activeBuffs.filter((b) => b.expiresAt > now);
  }

  /** 收集当前激活 buff 对命中公式的加法修饰（按 stat 聚合） */
  collectActiveBuffs(now: number): { dodge: number; hitBonus: number } {
    let dodge = 0;
    let hitBonus = 0;
    for (const b of this.activeBuffs) {
      if (b.expiresAt <= now) continue;
      if (b.def.stat === 'dodge') dodge += b.def.value;
      else hitBonus += b.def.value;
    }
    return { dodge, hitBonus };
  }

  /** 是否还有任何激活的 buff */
  hasActiveBuffs(now: number): boolean {
    return this.activeBuffs.some((b) => b.expiresAt > now);
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
