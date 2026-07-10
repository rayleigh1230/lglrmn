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
  number, // [6]  reserved（恒等于[7]，冗余；docs/10 旧标 slot_weapon_max 有误）
  number, // [7]  ★command 指挥值（白名单 1-55，按舰种递增：航母 40-55、战列 45、战巡 28-35、护卫 3-8、战机/护航艇 1-2；舰队上限 300-420）
  number, // [8]  ★curvature_speed 曲率速度（9船锚点全验证，之前误标unknown）
  string, // [9]  cost_str 建造成本
  number, // [10] build_cost_total
  number, // [11] ★ship_type 舰种（1战机2护航艇3护卫4驱逐5巡洋6战巡7支援8航母9战列，对照白名单169艘全验证）
  number, // [12] ship_type2（恒等于[11]）
  number, // [13] exploit_capacity 开采/驻泊容量（航母110000-150000，护卫1000-2200，战机/无人机=0）。★非游戏"指挥值"，勿用于编队校验
  number, // [14] reserved
  number, // [15] reserved
  number, // [16] reserved
  number, // [17] reserved
  number, // [18] reserved
  number, // [19] ★aircraft_type 战机规格（LIGHT=1/MID=2/HEAVY=3，护航艇=0无规格；frida dump 实测确认）
  number, // [20] ★aircraft_group_num 编队架数（战机/护航艇>1，主力舰=1）
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
  CURVATURE: 8, // ★曲率速度（9船锚点全验证，docs/10 把[8]标成unknown是错的）
  COMMAND: 7, // ★指挥值（白名单 1-55，按舰种递增：航母40-55、战列45、战巡28-35、护卫3-8、战机/护航艇1-2）
  SHIP_TYPE: 11, // ★舰种（1战机2护航艇3护卫4驱逐5巡洋6战巡7支援8航母9战列）
  /** exploit_capacity 开采/驻泊容量（CfgShipField.EXPLOIT_CAPACITY，索引[13]）。
   *  实证：航母 110000-150000，战列 150000，护卫 1000-2200，战机/无人机=0。
   *  ★这是开采/驻泊容量，不是游戏 UI 的"指挥值"——单艘就 15 万，与舰队指挥值上限
   *  （300-420）差三个数量级，逻辑不可能成立。编队指挥值请用 COMMAND([7])。
   *  2026-07 交接提交 7ad524d 曾误把 [13] 当指挥值，已回滚。 */
  EXPLOIT_CAPACITY: 13,
  AIRCRAFT_TYPE: 19, // ★战机规格（LIGHT=1/MID=2/HEAVY=3，护航艇=0；frida dump 实测确认 [19]）
  AIRCRAFT_GROUP_NUM: 20, // ★编队架数（战机/护航艇>1，主力舰=1；火力=单武器DPS×此值，dump确认）
  SIZE_CLASS: 21,
  MODEL_CODE: 23,
} as const;

/** 战机规格枚举（对齐 CfgShipField.AircraftType，frida dump 确认）
 *  - LIGHT(1): 轻型（砂龙拦截机/SC002侦察机）
 *  - MID(2): 中型（B192攻击机/AT021攻击机）
 *  - HEAVY(3): 重型（BR050轰炸机）
 *  机库规格匹配（对齐 is_aircraft_avaliable_for_ship）：
 *    HEAVY 机库收 HEAVY+MID+LIGHT；MID 机库收 MID+LIGHT；LIGHT 机库只收 LIGHT。
 *  护航艇 aircraft_type=0（无规格，所有护航艇坞舱都能进）。 */
export const AIRCRAFT_TYPE = { LIGHT: 1, MID: 2, HEAVY: 3 } as const;

export type RawShipTable = Record<string, RawShipRow>;

// ===== cfg_ship_blueprint 字段索引常量 =====
/** cfg_ship_blueprint 字段索引（对齐 Tb_cfg_ship_blueprint，避免魔法数字）。
 *  数据来源：反编译 common.ship_utils.get_ship_blueprint_max_num 读 MAX_NUM 做服役数校验。 */
export const SHIP_BP = {
  /** MAX_NUM 服役数上限（该蓝图最多能造/上阵多少艘）。
   *  实测档位：护卫/驱逐/战机/护航艇=10(未央15/雷火战机8)、巡洋=8(未央12)、
   *  战巡=6(雷火之星/安东塔斯3)、支援=2-3、航母=5(特殊3)、战列=3。
   *  特殊船直接硬编码在此字段，无需派系判断。 */
  MAX_NUM: 7,
} as const;

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
  /**
   * ★效果类型（对齐客户端 CfgSystemEnhanceField.EffectType）。
   * 数据实证（28198 行）：仅值 2/3/5 出现 + 大量缺失（缺失=普通 ENHANCE，等同 1/无值）。
   *   缺失/无值 = EFFECT_TYPE_ENHANCE（普通强化项，optIdx 01-11）
   *   2 = ENHANCE/ADJUST（调校槽，optIdx 31-43，特征是带 ADJUST_PROB）
   *   3 = EFFECT_TYPE_ENHANCE_EX（巅峰强化奖励 EXCLUSIVE，optIdx 70/71，field[1]）
   *   5 = EFFECT_TYPE_ENHANCE_ADD（巅峰强化奖励 EXCLUSIVE，optIdx 70/71，field[1]）
   * 客户端 get_enhancement_type 据此三分类：SYSTEM_ENHANCEMENT / SYSTEM_EXTEND / SYSTEM_ADJUST。
   */
  EFFECT_TYPE?: number;
  /**
   * ★解锁类型（对齐 CfgSystemEnhanceField.UnlockType）。
   * 数据实证：仅值 2 出现（4343 行）+ 大量缺失（缺失=NONE）。
   *   缺失/无值/0 = UNLOCK_TYPE_NONE
   *   2 = UNLOCK_TYPE_RE_TECH（逆向科技/武器技术解锁槽，optIdx 4-12 浮动）
   */
  UNLOCK_TYPE?: number;
  // ===== 调校槽（ADJUST_PROB 特征识别，optIdx 主体 31-43）专用字段 =====
  /** 调校目标：被调校的父强化项 optIdx（ADJUST_ENHANCE_INDEX，1-13）。父 enhanceId = shipId+slot+pad2(此值) */
  ADJUST_ENHANCE_INDEX?: number;
  /** 调校各级成功率（10级，如 (100,100,100,90,80,70,60,50,25,15)） */
  ADJUST_PROB?: number[];
  /** 调校所需武器技术稀有度 */
  ADJUST_RARITY?: number;
  /** 调校武器技术类型限制（如 "6,3"） */
  ADJUST_WEAPON_TECH_TYPE_LIMIT?: string;
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
  /** 模块效果表（cfg_module_effect.json，key = moduleId+2位序号） */
  moduleEffect: Record<string, RawModuleEffect>;
  /** 舰船巅峰等级表: key = shipId(5) + peakLv(2), value = [强化串, 70号调校解锁串] */
  shipPeakLevel?: Record<string, [string, string]>;
  /** 巅峰等级经验阈值表: key = 巅峰等级(1-19), value = [等级, 累计经验] */
  blueprintPeakLevel?: Record<string, [number, number]>;
  /** 巅峰等级授权表: key = 蓝图ID+路线, 含开启条件道具+任务ID */
  peakLevelAuth?: Record<string, unknown[]>;
  /** 系统技能表(调校候选): 调校三步链可能藏此表 */
  systemSkill?: Record<string, Record<string, unknown>>;
  /** ★强化项科技树前置依赖: key=enhanceId(9位), value=["parents;treeId", flag] */
  systemEnhanceTree?: Record<string, [string, number]>;
  /** ★EFFECT_ID→三通道映射（frida dump，34条；决定 EID 走 ratio_add/ratio_del/num_add/num_del/base_num_add/base_num_del） */
  weaponNumAttr?: Record<string, { EFFECT_ATTR_NAME: string; TABLE_NAME: string; EFFECT_TYPE: string }>;
  /** ★调校→父强化映射（frida dump，2262条；对齐客户端 SYSTEM_ADJUST_IN_ENHANCE）。
   * key=调校enhanceId(9位), value=父强化enhanceId(9位)。
   * is_enhance_influence_effect_value 用它把调校重定向到父强化查 effect。 */
  systemAdjustInEnhance?: Record<string, number>;
  /** ★模块表（cfg_module.json，frida dump；key = weaponId/moduleId, value=[MODULE_TYPE, ...]）。
   *  blueprintCalc 读 [0]=MODULE_TYPE 用于 TMT 作用域判定。 */
  cfgModule?: Record<string, unknown[]>;
  /** ★系统效果强化数据（system_effect_enhance_data.json，frida dump）。
   *  key = effect_id，value = 该 effect 关联的 system_effect_id 列表。
   *  载机 DPS 递归的 _filter_drone_enhance 用它判断强化 effect 链是否触达 DRONE_EFFECT_IDS。 */
  systemEffectEnhanceData?: Record<string, unknown[]>;
  /** ★强化项数值表（enhance_values.json，frida dump）：enhanceId+level → {value, effect_id}。
   *  解决 EFFECT_PARAM 空的伤害类数值来源。 */
  enhanceValues?: Record<string, unknown>;
}

// ===== cfg_module_effect.json（模块效果表）=====
// 格式：{ row_id: {字段} }，row_id = moduleId(5位) + 2位序号（如 4604101 = module 46041 的第 01 条效果）。
// 客户端 BLUEPRINT_MODULE_EFFECT.get(moduleId) 取该模块全部效果 = row_id 前 5 位匹配。
export interface RawModuleEffect {
  /** 效果类型 ID（决定机制，查 effect_def）。
   *  载机相关（对齐 DRONE_EFFECT_IDS）：
   *    2020 EFFECT_CARRIER（搭载战机） / 2021 EFFECT_CARRIER_BOAT（搭载护航艇）
   *    2022 EFFECT_DRONE（搭载无人机） / 2023 EFFECT_ACCOMPANY_DRONE（伴飞无人艇）
   *    2024 EFFECT_CARRIER_EFFECT_LIMIT（机库容量限制标记，★非载机来源，必须排除）
   *  容量相关：2034 EFFECT_MODULE_CAPACITY（模块容量基础值）/ 2035 EFFECT_MODULE_CAPACITY_INC（容量比例）。
   *  来源：data/client/tools/effect_enum_values.json（字节码提取）。 */
  EFFECT_ID?: number;
  /** 效果参数。
   *  载机类（2020-2023）：ship_id = PARAM / 100, num = PARAM % 100。
   *    注：2020/2021 的 PARAM 为 class*100+count（如 201=中型战机×1）；2022/2023 为具体 ship_id*100+count。 */
  EFFECT_PARAM?: number;
  NAME?: string;
  DESC?: string;
  DESC_SIMP?: string;
  /** 目标系统：0=ALL, 1=SELF, 2=MAIN, 3=OTHER */
  TARGET_SYSTEM?: number;
  /** 目标队伍 */
  TARGET_TEAM?: number;
  /** 目标槽位索引（-1=不限） */
  TARGET_INDEX?: number;
  /** 是否显示 */
  EFFECT_SHOW?: number;
  [k: string]: unknown;
}

// ===== cfg_ship_type.json（舰种表）=====
// 格式：{ ship_type: [name, desc, ...字段, ship_hp_add, ...] }
// 关键字段 [8] = 抵抗基础值（护卫/驱逐/巡洋=10，战巡/航母/战列=5）
// 关键字段 [9] = ship_hp_add（普通舰每科技点结构加成：驱逐=40/护卫=20/巡洋=60；超主力舰=0无版本号加成）
// 关键字段 [10] = 超主力舰专属值=50（用途待定，非结构加成——实测超主力舰无版本号结构加成）
export type RawShipTypeRow = [
  string, // [0] name 舰种名
  string, // [1] desc 描述
  number, // [2] level 等级
  number, // [3] ?
  string, // [4] 巅峰等级阈值串
  number, // [5] ?
  number, // [6] ?
  number, // [7] ?
  number, // [8] ★抵抗基础值（护卫10/战巡5）
  number, // [9] ★ship_hp_add（普通舰每科技点结构加成，超主力舰=0）
  number, // [10] 超主力舰专属值=50（用途待定，非结构加成）
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
