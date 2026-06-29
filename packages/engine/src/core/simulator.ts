/**
 * 主仿真器 —— 把所有部件串成完整的 DES 主循环。
 *
 * 主循环：
 *   for t in 0..maxTime:
 *     取出到点事件 → 执行 → 衍生新事件入队
 *   任一方全灭则提前结束。
 *
 * 每个武器按攻击循环周期产生 weaponFire 事件：
 *   循环 = fireDuration（持续开火）+ cooldown（冷却）
 *   fireDuration 内按 shotsPerCycle 均匀打出多发。
 *
 * MVP-1 简化：fireDuration 内的多次开火拆成多个 weaponFire 事件，
 * 间隔 = fireDuration / shotsPerCycle；一个循环结束后排下一轮首发的
 * weaponCooldownEnd 事件（time + cooldown）。
 */
import type { Fleet, RNG } from '../types/index.js';
import type { SimEvent, AttackRecord, BattleReport } from '../types/events.js';
import { RuntimeFleet, RuntimeShip, RuntimeWeapon } from '../model/runtime.js';
import { Scheduler } from './scheduler.js';
import { selectTarget, aliveShips } from '../phases/target.js';
import { interceptCheck } from '../phases/intercept.js';
import { hitCheck } from '../phases/hit.js';
import { critCheck } from '../phases/crit.js';
import { damageCalc } from '../phases/damage.js';

export interface SimulateOptions {
  /** 最大仿真时长（秒） */
  maxTime: number;
  /** 随机数源 */
  rng: RNG;
}

/** 由 Fleet + RNG 构造并运行一次战斗 */
export function simulate(
  fleetAlly: Fleet,
  fleetEnemy: Fleet,
  options: SimulateOptions
): BattleReport {
  const sim = new Simulator(fleetAlly, fleetEnemy, options);
  return sim.run();
}

class Simulator {
  private ally: RuntimeFleet;
  private enemy: RuntimeFleet;
  private scheduler = new Scheduler();
  private rng: RNG;
  private maxTime: number;
  private attacks: AttackRecord[] = [];

  constructor(fleetAlly: Fleet, fleetEnemy: Fleet, opts: SimulateOptions) {
    this.ally = new RuntimeFleet(fleetAlly);
    this.enemy = new RuntimeFleet(fleetEnemy);
    this.rng = opts.rng;
    this.maxTime = opts.maxTime;
  }

  run(): BattleReport {
    this.initWeaponTimers(this.ally, 'ally');
    this.initWeaponTimers(this.enemy, 'enemy');

    // 事件驱动主循环：直接跳到队列中下一个事件的时刻，不固定 tick 递增。
    // 这样 cooldownEnd@10 在 t=10 处理后排出的次轮首发@10，能在同一批被取出，
    // 避免固定 tick 模型下"过期事件被推到下一秒"的边界 bug。
    while (this.bothAlive()) {
      const nextTime = this.scheduler.peekNextTime();
      if (nextTime > this.maxTime || nextTime === Infinity) break;
      // 取出所有在该时刻触发的事件（同 time 一批处理）
      const due = this.scheduler.popDue(nextTime);
      // 处理当前批事件；处理中新排的同时刻事件也会被本轮捕获（见下循环）
      for (const evt of due) {
        this.handleEvent(evt, nextTime);
        if (!this.bothAlive()) break;
      }
      // 处理本轮事件期间新排出的、时刻 ≤ nextTime 的衍生事件（如 cooldownEnd
      // 触发的次轮首发可能就在 nextTime）。持续捕获直到该时刻事件清空。
      while (this.bothAlive() && this.scheduler.peekNextTime() <= nextTime && this.scheduler.peekNextTime() !== Infinity) {
        const extra = this.scheduler.popDue(nextTime);
        for (const evt of extra) {
          this.handleEvent(evt, nextTime);
          if (!this.bothAlive()) break;
        }
      }
      if (!this.bothAlive()) break;
    }

    // 最终时刻 = 最后一个被处理事件的时刻（上限 maxTime）
    const endTime = this.attacks.length > 0
      ? Math.min(this.attacks[this.attacks.length - 1].time, this.maxTime)
      : 0;
    return this.buildReport(endTime);
  }

  /** 给每艘舰的每个武器排首轮开火事件（含锁定时间，仅首次） */
  private initWeaponTimers(fleet: RuntimeFleet, _side: 'ally' | 'enemy'): void {
    for (const ship of fleet.ships) {
      for (const weapon of ship.weapons) {
        if (weapon.disabled) continue;
        // 首次开火需先锁定目标（lockOnTime，默认0）
        const firstFireTime = weapon.def.lockOnTime ?? 0;
        this.scheduleWeaponCycle(ship, weapon, firstFireTime);
      }
    }
  }

  /**
   * 为一个武器排一个完整循环的开火事件。
   * fireDuration 内按 shotsPerCycle 均匀打出多发（每发间隔 = fireDuration/shots）。
   * 注意：锁定时间仅在战斗开始首次生效，后续循环直接从 startTime 开火。
   */
  private scheduleWeaponCycle(ship: RuntimeShip, weapon: RuntimeWeapon, startTime: number): void {
    if (weapon.disabled || ship.destroyed) return;
    const def = weapon.def;
    // 多发分布：shots 发在 fireDuration 秒内均匀分布，间隔 = fireDuration/shots
    // 例：3发/3秒 → 间隔1秒 → t=0,1,2 开火
    const interval = def.shotsPerCycle > 0 ? def.fireDuration / def.shotsPerCycle : 0;
    for (let i = 0; i < def.shotsPerCycle; i++) {
      // 首发在 startTime，第 i 发在 startTime + i*interval
      const fireTime = startTime + Math.round(i * interval);
      this.scheduler.schedule({
        time: fireTime,
        kind: 'weaponFire',
        payload: { shipId: ship.def.id, weaponId: weapon.def.id },
      });
    }
    // 循环结束 + 冷却 → 下一轮首发
    const nextCycleStart = startTime + def.fireDuration + def.cooldown;
    this.scheduler.schedule({
      time: nextCycleStart,
      kind: 'weaponCooldownEnd',
      payload: { shipId: ship.def.id, weaponId: weapon.def.id },
    });
  }

  private handleEvent(evt: SimEvent, now: number): void {
    switch (evt.kind) {
      case 'weaponFire':
        this.handleWeaponFire(evt, now);
        break;
      case 'weaponCooldownEnd':
        this.handleCooldownEnd(evt);
        break;
      default:
        // 后期事件占位
        break;
    }
  }

  /** 处理一次武器开火：目标选择→拦截→命中→暴击→伤害→摧毁判定 */
  private handleWeaponFire(evt: SimEvent, now: number): void {
    const { shipId, weaponId } = evt.payload as { shipId: string; weaponId: string };
    const { ship, weapon, enemies } = this.resolveCombatants(shipId, weaponId);
    if (!ship || !weapon || weapon.disabled || ship.destroyed) return;
    if (enemies.length === 0) return;

    const target = selectTarget(weapon.def, enemies);
    if (!target) return;

    const record = this.resolveAttack(ship, weapon, target, now);
    this.attacks.push(record);

    // 击沉则清理其后续事件（由 aliveShips 过滤自然忽略）
  }

  /** 处理冷却结束：排下一轮循环 */
  private handleCooldownEnd(evt: SimEvent): void {
    const { shipId, weaponId } = evt.payload as { shipId: string; weaponId: string };
    const { ship, weapon } = this.resolveCombatants(shipId, weaponId);
    if (!ship || !weapon || weapon.disabled || ship.destroyed) return;
    this.scheduleWeaponCycle(ship, weapon, evt.time);
  }

  /** 解析一次攻击的所有参与方 */
  private resolveCombatants(
    shipId: string,
    weaponId: string
  ): {
    ship: RuntimeShip | null;
    weapon: RuntimeWeapon | null;
    enemies: RuntimeShip[];
  } {
    // 在双方中查找攻击者
    let ship: RuntimeShip | null = null;
    let isAlly = false;
    for (const s of this.ally.ships) {
      if (s.def.id === shipId) {
        ship = s;
        isAlly = true;
        break;
      }
    }
    if (!ship) {
      for (const s of this.enemy.ships) {
        if (s.def.id === shipId) {
          ship = s;
          break;
        }
      }
    }
    if (!ship) return { ship: null, weapon: null, enemies: [] };

    const weapon = ship.weapons.find((w) => w.def.id === weaponId) ?? null;
    // 敌方 = 对立阵营的存活舰船
    const enemyFleet = isAlly ? this.enemy : this.ally;
    const enemies = aliveShips(enemyFleet.ships);
    return { ship, weapon, enemies };
  }

  /** 走完整结算链路，返回攻击记录 */
  private resolveAttack(
    _ship: RuntimeShip,
    weapon: RuntimeWeapon,
    target: RuntimeShip,
    now: number
  ): AttackRecord {
    // 1. 拦截判定（MVP-1 不拦截）
    const intercept = interceptCheck(weapon.def, target, []);
    if (intercept.intercepted) {
      return this.makeRecord(now, _ship, weapon, target, 0, false, false, true);
    }

    // 2. 命中判定
    const hit = hitCheck(weapon.def, target.def, this.rng);
    if (!hit.hit) {
      return this.makeRecord(now, _ship, weapon, target, 0, false, false, false);
    }

    // 3. 暴击判定
    const crit = critCheck(weapon.def, this.rng);

    // 4. 伤害结算
    const dmg = damageCalc(weapon.def, target.def, crit.crit);
    const destroyed = target.takeDamage(dmg.final);

    if (destroyed) {
      // 击沉：标记，后续事件会被 aliveShips 过滤
    }

    return this.makeRecord(now, _ship, weapon, target, dmg.final, true, crit.crit, false);
  }

  private makeRecord(
    time: number,
    ship: RuntimeShip,
    weapon: RuntimeWeapon,
    target: RuntimeShip,
    damage: number,
    hit: boolean,
    crit: boolean,
    intercepted: boolean
  ): AttackRecord {
    return {
      time,
      attackerShipId: ship.def.id,
      attackerWeaponId: weapon.def.id,
      targetShipId: target.def.id,
      damage,
      hit,
      crit,
      intercepted,
      targetStructureAfter: target.structure,
    };
  }

  private bothAlive(): boolean {
    return this.ally.hasAlive() && this.enemy.hasAlive();
  }

  private buildReport(endTime: number): BattleReport {
    const winner: BattleReport['winner'] = !this.ally.hasAlive()
      ? 'enemy'
      : !this.enemy.hasAlive()
        ? 'ally'
        : 'draw';

    return {
      duration: endTime,
      winner,
      attacks: this.attacks,
      survivors: {
        ally: this.ally.ships
          .filter((s) => !s.destroyed)
          .map((s) => ({ shipId: s.def.id, structure: s.structure })),
        enemy: this.enemy.ships
          .filter((s) => !s.destroyed)
          .map((s) => ({ shipId: s.def.id, structure: s.structure })),
      },
    };
  }
}
