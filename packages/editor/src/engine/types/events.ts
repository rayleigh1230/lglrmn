/**
 * 仿真事件类型定义
 *
 * 事件是 DES（离散事件仿真）的通信单元。每个事件在某个时刻触发，
 * 走完整结算链路，并可能衍生出新事件入队。
 */
import type { TargetClass } from './index';

/** 事件种类 */
export type EventKind =
  | 'weaponFire' // 武器开火（一次攻击循环开始）
  | 'weaponCooldownEnd' // 武器冷却结束（可进入下一轮循环）
  | 'shipDestroyed' // 舰船被摧毁
  | 'weaponDisabled' // 武器子系统失能（结构值归零）
  // 后期事件：
  | 'fighterLaunch' // 舰载机出击
  | 'fighterArrive' // 舰载机飞抵目标格
  | 'fighterReturn' // 舰载机返航补给
  | 'skillReady' // 策略技能就绪
  | 'skillExpire'; // 策略技能效果到期

/** 事件基础接口 */
export interface SimEvent {
  /** 触发时刻（浮点秒） */
  time: number;
  kind: EventKind;
  payload: WeaponFirePayload | SkillPayload | GenericPayload;
}

/** 武器开火事件 */
export interface WeaponFirePayload {
  /** 开火武器所在舰船 id */
  shipId: string;
  /** 武器系统 id */
  weaponId: string;
}

/** 技能事件（后期） */
export interface SkillPayload {
  shipId: string;
  skillId: string;
}

/** 通用事件载荷 */
export interface GenericPayload {
  [key: string]: unknown;
}

// ===== 结算结果（事件日志的记录单元）=====

/** 一次攻击的完整结算结果，写入事件日志供人工核对 */
export interface AttackRecord {
  /** 攻击发生时刻（浮点秒） */
  time: number;
  attackerShipId: string;
  attackerWeaponId: string;
  targetShipId: string;
  /** 实际造成伤害（0 表示未命中或被拦截） */
  damage: number;
  hit: boolean;
  crit: boolean;
  /** 是否被反导拦截（后期） */
  intercepted?: boolean;
  /** 攻击后目标剩余结构值 */
  targetStructureAfter: number;
}

/** 战斗报告 */
export interface BattleReport {
  /** 仿真总时长（浮点秒） */
  duration: number;
  /** 胜方（'ally'|'enemy'|'draw'） */
  winner: 'ally' | 'enemy' | 'draw';
  /** 所有攻击结算记录（事件日志） */
  attacks: AttackRecord[];
  /** 战斗结束时各方舰船剩余结构 */
  survivors: {
    ally: Array<{ shipId: string; structure: number }>;
    enemy: Array<{ shipId: string; structure: number }>;
  };
}

/** 方便 AttackRecord 引用 TargetClass 类型（预留扩展） */
export type { TargetClass };
