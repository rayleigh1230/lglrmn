/**
 * 战斗实体与数据结构定义
 *
 * 设计原则：按"最终完整机制"定义字段，后期机制用可选字段扩展，
 * MVP 阶段只激活最小子集。加新机制时改实现不改架构。
 *
 * 详见 docs/01-战斗机制研究文档.md
 */

// ===== 网格与位置 =====

/** 阵营 */
export type Side = 'ally' | 'enemy';

/** 排：前 / 中 / 后 */
export type Row = 'front' | 'middle' | 'rear';

/**
 * 格位 —— 战场拓扑关系的原子单元。
 * 战斗中没有距离/移动概念，只有格位间的拓扑关系（同格/同排/同半场/任意）。
 */
export interface Cell {
  side: Side;
  row: Row;
  col: number;
}

// ===== 伤害与武器分类 =====

/** 伤害类型：实弹（吃抵抗） / 能量（吃护盾） */
export type DamageType = 'kinetic' | 'energy';

/**
 * 武器投射方式：
 * - direct 直射：受格位关系限制，主要打前排
 * - projectile 投射：导弹/鱼雷，可跨格攻击，但可被反导拦截
 */
export type WeaponDelivery = 'direct' | 'projectile';

/**
 * 目标类型 —— 命中率与攻击序列按此分类。
 * 决定武器对哪种目标有怎样的基础命中、攻击序列优先级。
 */
export type TargetClass =
  | 'frigate' // 护卫舰
  | 'destroyer' // 驱逐舰
  | 'cruiser' // 巡洋舰
  | 'battlecruiser' // 战列巡洋舰
  | 'carrier' // 航空母舰/超主力舰
  | 'fighter' // 战机（舰载机）
  | 'corvette' // 护航艇
  | 'structure'; // 建筑

/** 拦截/防空的作用范围，基于格位拓扑关系 */
export type InterceptScope = 'sameCell' | 'sameRow' | 'sameSide' | 'anywhere';

// ===== 武器系统（仿真最小单元）=====

/**
 * 武器系统的静态定义（蓝图数据）。
 * 一个舰船可装配多个武器系统，各自独立运作攻击循环。
 */
export interface WeaponSystem {
  id: string;
  /** 武器名称（如"CG-130D型机载火炮"） */
  name: string;

  damageType: DamageType;
  delivery: WeaponDelivery;

  // --- 攻击循环参数（docs §2）---
  /** 单发伤害 DPH */
  dph: number;
  /** 每循环开火次数 */
  shotsPerCycle: number;
  /** 持续开火时长（秒） */
  fireDuration: number;
  /** 冷却时长（秒） */
  cooldown: number;
  /**
   * 锁定时间（秒）：首次锁定目标所需时间，仅在战斗开始时计一次。
   * 默认 0。实测 FG300 主武器为 3s。
   * 完整周期 = 锁定(仅首次) + (持续+冷却) × n
   */
  lockOnTime?: number;

  // --- 命中（docs §3）---
  /** 基础命中率，按目标类型分别记录（0~1） */
  baseHit: Partial<Record<TargetClass, number>>;
  /** 命中加成（蓝图强化等，0~1，默认0） */
  hitBonus?: number;
  /** 暴击率（0~1，默认 0.15） */
  critRate?: number;
  /** 暴击伤害倍率（默认 2.0 = 造成 200% 伤害） */
  critMultiplier?: number;

  // --- 攻击序列（docs §6）---
  /** 目标优先级，从高到低。空则表示无特殊优先级 */
  targetPriority?: TargetClass[];

  // --- 防空/拦截（后期，留插槽，docs §8）---
  intercept?: {
    scope: InterceptScope;
    /** 单艘基础拦截率（0~1） */
    rate: number;
  };

  // --- 子系统结构（docs §7）---
  /** 该武器子系统自身结构值，归零则永久失能 */
  structure: number;
}

// ===== 舰船 =====

/** 舰船的静态定义（蓝图数据） */
export interface Ship {
  id: string;
  name: string;
  class: TargetClass;
  /** 所在格位 */
  cell: Cell;

  // --- 防御（docs §1）---
  /** 本体结构值 HP */
  structure: number;
  /** 抵抗值（实弹减伤，标准=10） */
  resistance: number;
  /** 护盾值（能量减伤百分比，0~1，如 0.02 = 2%） */
  shield: number;
  /** 闪避率（0~1） */
  dodge: number;

  weapons: WeaponSystem[];
}

// ===== 舰载机（后期，接口先留，docs §8.1）=====

/** 舰载机：占格实体，随锁定目标移动到目标格位 */
export interface Fighter {
  id: string;
  /** 当前所在格（=锁定目标格） */
  cell: Cell;
  /** 锁定的舰船 id */
  targetShipId: string;
  // 武器、燃料、返航周期等后期填
}

// ===== 编队 =====

export interface Fleet {
  ships: Ship[];
  /** 舰载机（后期） */
  fighters?: Fighter[];
}

// ===== 随机源 =====

/** 可注入的随机数源 [0,1)。固定种子可复现同一份战报。 */
export interface RNG {
  next(): number;
}
