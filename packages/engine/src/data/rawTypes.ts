/**
 * 客户端原始配置表类型定义
 *
 * 这些类型直接对应 `data/client/config/*.json` 的原始结构（frida dump 自游戏客户端）。
 * 只声明数据层实际用到的字段，不全量声明（避免噪音），后续里程碑按需扩展。
 *
 * 字段含义详见 docs/10-客户端配置表字段字典.md、docs/11-数据流与表间关联.md。
 */

// ===== cfg_ship.json（舰船主表）=====
// 格式：{ ship_id: [26个字段] }，ship_id 为 5 位数字字符串。
// 字段按数组索引访问，含义见 docs/10 §1.1。
export type RawShipRow = [
  string, // [0]  name_full 全名
  string, // [1]  name_short 简称
  string, // [2]  desc 描述
  number, // [3]  ship_class 舰种分类码
  number, // [4]  structure ★本体结构值 HP
  number, // [5]  speed 航行速度
  number, // [6]  slot_weapon_max
  number, // [7]  slot_weapon_max2（恒等于[6]）
  number, // [8]  unknown_f8
  string, // [9]  cost_str 建造成本
  number, // [10] build_cost_total
  number, // [11] slot_row_count ★槽位行数
  number, // [12] slot_row_count2（恒等于[11]）
  number, // [13] unknown_f13
  number, // [14] reserved
  number, // [15] reserved
  number, // [16] reserved
  number, // [17] reserved
  number, // [18] reserved
  number, // [19] reserved
  number, // [20] flag
  number, // [21] size_class ★体型等级
  number, // [22] flag2
  string, // [23] model_code ★模型代号
  number, // [24] reserved
  number, // [25] reserved
];

/** cfg_ship 字段索引常量（避免魔法数字） */
export const SHIP = {
  NAME_FULL: 0,
  NAME_SHORT: 1,
  SHIP_CLASS: 3,
  STRUCTURE: 4,
  SPEED: 5,
  SLOT_ROW_COUNT: 11,
  SIZE_CLASS: 21,
  MODEL_CODE: 23,
} as const;

export type RawShipTable = Record<string, RawShipRow>;

// ===== cfg_system_effect.json（系统效果表）=====
// 格式：{ effect_id: {字段} }，effect_id = PREFIX + level（如 889001 = 8890 + level1）
export interface RawSystemEffect {
  /** 效果类型 ID（决定机制，查 effect_def） */
  EFFECT_ID?: number;
  /** 效果名（中文） */
  NAME?: string;
  /** 效果参数（单值，万分比或绝对值） */
  EFFECT_PARAM?: number;
  /**
   * 分等级数值表（974条有此字段），格式 "level,value;level,value;..."
   * 例："1,200;2,500;3,800;4,1100;5,1400"
   * 有此字段时按 level 查表取值，否则用 EFFECT_PARAM。
   */
  EFFECT_PARAM_LEVEL?: string;
  /** 效果描述（含 {101} 等占位符） */
  DESC?: string;
  /** 目标系统类型 */
  TARGET_SYSTEM?: number;
  /** 目标模块类型 */
  TARGET_MODULE_TYPE?: number;
  [k: string]: unknown;
}

export type RawSystemEffectTable = Record<string, RawSystemEffect>;

// ===== cfg_system_enhance.json（系统强化表）=====
// 格式：{ enhance_id: {字段} }，enhance_id = shipId(5) + slot(2) + optionIdx(2)（9位）
export interface RawSystemEnhance {
  /** ★系统效果前缀（=战报科技串的 techId，拼 level 后查 system_effect） */
  SYSTEM_EFFECT_PREFIX: number;
  /** 强化消耗（按等级） */
  ENHANCE_COST?: number[];
  /** 显示顺序 */
  DISPLAY_ORDER?: number;
  /** 强化上限标记 */
  ENHANCE_LIMIT_TAG?: number;
  /** 默认等级 */
  ENHANCE_DEFAULT_LEVEL?: number;
  [k: string]: unknown;
}

export type RawSystemEnhanceTable = Record<string, RawSystemEnhance>;

// ===== cfg_effect_def.json（效果机制字典）=====
// 格式：{ EFFECT_ID: [id, 名称, param0...param50] }，544 条机制定义
export type RawEffectDefRow = [number, string, ...number[]];

export type RawEffectDefTable = Record<string, RawEffectDefRow>;

// ===== 配置表总存储 =====
export interface ClientDataStore {
  ship: RawShipTable;
  systemEffect: RawSystemEffectTable;
  systemEnhance: RawSystemEnhanceTable;
  effectDef: RawEffectDefTable;
  weapon: Record<string, Record<string, unknown>>;
  shipSlot: Record<string, unknown[]>;
  shipSystem: Record<string, RawShipSystem>;
  /** 舰种表（含 SHIP_HP_ADD，版本号计算用） */
  shipType: Record<string, RawShipTypeRow>;
  /** 蓝图主表（可强化模块清单） */
  shipBlueprint: Record<string, unknown[]>;
  /** 武器开火动作时序 */
  weaponAction: Record<string, unknown[]>;
  /** 武器优先级 */
  weaponPriority: Record<string, unknown[]>;
  /** 模块效果表 */
  moduleEffect: Record<string, Record<string, unknown>>;
}

// ===== cfg_ship_type.json（舰种表）=====
// 格式：{ ship_type: [name, desc, ...字段, ship_hp_add, ...] }
// 关键字段 [9] = SHIP_HP_ADD（每技术值点的结构加成，版本号计算用）
export type RawShipTypeRow = [
  string, // [0] name 舰种名
  string, // [1] desc 描述
  number, // [2] level 等级
  number, // [3] ?
  string, // [4] 巅峰等级阈值串
  number, // [5] ?
  number, // [6] ?
  number, // [7] ?
  number, // [8] ship_system_hp_add
  number, // [9] ★ship_hp_add（每技术值点的结构加成）
  number, // [10] ?
];

// ===== cfg_ship_system.json（舰船子系统/模块定义）=====
// 格式：{ system_id: {字段} }，system_id = shipId(5) + slot(2)
export interface RawShipSystem {
  NAME?: string;
  /** 子系统HP */
  HP?: number;
  /** 系统标签（载机/装甲/动力等） */
  SYSTEM_LABEL?: string;
  /** 系统类型 */
  SYSTEM_TYPE?: number;
  /** 所属组（同组模块互斥选择） */
  GROUP?: number;
  /** 是否主系统 */
  MAIN_SYSTEM?: number;
  /** 是否可攻击 */
  ATTACKABLE?: number;
  /** 是否可选模块（1=可选，玩家装配；0/缺省=固定） */
  ADDITIONAL_SYS?: number;
  /** 解锁该组所需技术值点数 */
  POINT_REQUIRED_FOR_UNLOCK_GROUP?: number;
  /** 强化上限 */
  ENHANCEMENTS_LIMIT?: number;
  [k: string]: unknown;
}
