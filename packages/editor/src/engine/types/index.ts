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
 * 武器【命中/闪避分类】—— 决定该武器吃哪种"按武器类别的闪避词条"。
 *
 * 与 WeaponDelivery 是两个正交维度：
 *   - delivery：能否跨格、能否被反导（拓扑/拦截语义）
 *   - category：吃哪种闪避词条（命中公式语义）
 *
 * 游戏里有三类针对特定武器类别的闪避词条：
 *   - 直射武器闪避（最通用）
 *   - 制导武器/导弹/鱼雷闪避
 *   - 慢速武器闪避（轨道炮、离子炮——虽属直射，但有专门词条）
 *
 * 因此轨道炮/离子炮标为 'slow' 而非 'direct'：它们命中时匹配的是
 * "慢速武器闪避"词条（若目标有），而不是"直射武器闪避"。
 * 缺省 'direct'。
 */
export type WeaponCategory = 'direct' | 'guided' | 'slow';

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

/**
 * 命中率取值：单值或区间。
 * 游戏面板命中率显示为区间（如 50%-70%），引擎每发开火在区间内独立 roll。
 * 单值（如 0.8）等价于区间 {min:0.8,max:0.8}，向后兼容。
 */
export type HitRate = number | { min: number; max: number };

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
  /**
   * 武器命中/闪避分类（吃哪种闪避词条）。
   * 与 delivery 正交：direct 武器可能细分为 'direct' 或 'slow'（轨道炮/离子炮）。
   * 缺省 'direct'。
   */
  category?: WeaponCategory;

  // --- 攻击循环参数（docs §2）---
  /** 单发伤害 DPH */
  dph: number;
  /**
   * 每个攻击循环打出的【总开火次数】（每发独立判定命中/暴击/伤害）。
   *
   * 与游戏面板"弹药 × 次数"的映射关系（实测校准，2026-06）：
   *   shotsPerCycle = 弹药 × 次数
   *   - "弹药" = 每次开火打出的弹数（如弹药2 = 一次打2发）
   *   - "次数" = 一个循环内开火几轮（如次数3 = 打3轮）
   *   例：FG300 武器1 "弹药1 次数3" → shotsPerCycle=3
   *       阋神星 武器2 "弹药2 次数1" → shotsPerCycle=2
   *
   * 多发在 fireDuration 内均匀分布，间隔 = fireDuration/shotsPerCycle：
   *   - fireDuration>0：按间隔依次打出（如 3发/3秒 → t=0,1,2）
   *   - fireDuration=0：interval=0，多发在同一时刻作为独立事件打出
   *     （如 阋神星武器2 弹药2 持续0 → 2发同时打出，各自独立判定命中）
   */
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
  /** 基础命中率，按目标类型分别记录。
   * 取值可为：
   *   - 单值（如 0.8）：确定性命中基准，常用于测试/已标定武器
   *   - 区间（如 {min:0.5, max:0.7}）：游戏面板给的就是命中率区间，
   *     每发开火在区间内独立 roll 一次 base 值
   * 单值 0.8 等价于区间 {min:0.8,max:0.8}，二者可混用。
   */
  baseHit: Partial<Record<TargetClass, HitRate>>;
  /** 命中加成（蓝图强化等，0~1，默认0） */
  hitBonus?: number;
  /**
   * 对特定舰种的命中率提升（如"对驱逐/护卫命中+15%"）。
   * 实测验证：该数值作为【加法项】塞进命中括号的 +槽（与 hitBonus 同位置）。
   * 命中公式：base × (1 + hitBonus + 本项 − 目标闪避)。
   * 键为目标舰种，命中时按 target.class 查表。
   */
  hitBonusByTargetClass?: Partial<Record<TargetClass, number>>;
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
  /**
   * 对特定武器类别的闪避提升（如"被直射武器命中率下降15%"）。
   * 实测验证：该数值作为【加法项】塞进命中括号的 −槽（与通用 dodge 同位置）。
   * 命中公式：base × (1 + hitBonus + 对舰种命中 − dodge − 本项[匹配武器类别时])。
   * 仅当攻击武器的 category 匹配时才叠加；不匹配则忽略。
   *
   * 注：面板文案"被X武器命中率下降"与"对X武器闪避提升"数学等价，都落到这里。
   */
  dodgeByWeaponType?: Partial<Record<WeaponCategory, number>>;

  weapons: WeaponSystem[];

  /**
   * 临时 buff（策略类技能）—— 战斗中按条件触发的时效性修饰。
   *
   * 实测验证（2026-06，10艘斗牛跨度判据）：
   *   临时 buff 的修饰值作为【加法项】叠加进命中括号，与面板层修饰共用同一对槽：
   *     final = base × (1 + hitBonus + 对舰种命中 + buff加成 − dodge − 武器类别闪避 − buff闪避)
   *   即临时 buff 不走独立的乘法通道，而是和面板修饰一样做加法。
   *
   * 多舰场景存在【批次不同步】（各舰开火相位错开），导致多舰总时长系统性偏离
   * "N×单舰"模型；但命中率公式本身（加法）不受影响，已由单舰实验铁证。
   */
  tempBuffs?: TempBuff[];
}

// ===== 临时 buff（策略类技能，docs §4）=====

/** buff 修饰的命中级属性（与面板层同槽，加法叠加） */
export type BuffStat = 'dodge' | 'hitBonus';

/** buff 触发条件 */
export type BuffTrigger =
  | {
      /** 周期触发：每 period 秒触发一次 */
      kind: 'periodic';
      period: number;
    }
  | {
      /** 阈值触发：结构值低于 hpFrac 时触发（仅触发一次） */
      kind: 'threshold';
      /** 触发血量阈值，0~1（如 0.60 = 结构低于 60% 时触发） */
      hpFrac: number;
    };

/**
 * 单个临时 buff 定义。
 * 触发后激活 duration 秒，期间把 value 加法叠加到 stat 槽。
 */
export interface TempBuff {
  id: string;
  /** 触发条件 */
  trigger: BuffTrigger;
  /** 持续时长（秒） */
  duration: number;
  /** 修饰的属性 */
  stat: BuffStat;
  /** 修饰值（加法，正=提升/负=下降），如 dodge +0.40、hitBonus −0.15 */
  value: number;
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
