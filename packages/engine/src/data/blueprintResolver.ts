/**
 * 蓝图解析器（核心）—— 把战报科技串解析成强化效果，并计算出强化后的数值。
 *
 * 解析链路（docs/11，已由 斗牛级全面板 + CV3000 双重验证）：
 *   战报科技串三元组 (optIdx, PREFIX, level)
 *     → techId + level 拼 key 查 cfg_system_effect
 *     → 取 EFFECT_ID + 数值（A/B 两类规则，见下）
 *     → 按 EFFECT_ID 分类聚合
 *
 * ★ 数值规则（两类，由是否有 EFFECT_PARAM_LEVEL 决定）：
 *
 *   A类（有 EFFECT_PARAM_LEVEL，如结构强化/伤害提升）：
 *     value = 查 PARAM_LEVEL 表取 level 对应值
 *     单位 = 万分比（/10000）
 *     例：1121 龙骨增强 lv2 → PARAM_LEVEL="1,200;2,400;..." → 400 → 4%
 *
 *   B类（无 EFFECT_PARAM_LEVEL，直接 EFFECT_PARAM，如命中/速度/冷却/闪避）：
 *     value = PARAM × level / maxLevel  （maxLevel = ENHANCE_COST 数组长度）
 *     对 12012 命中类（PARAM 是多位编码），value = PARAM后2位 × level / maxLevel
 *     例：203 射击辅助 PARAM=3015(后2位=15) maxLevel=5 lv4 → 15×4/5=12%
 *
 *   注：maxLevel 从 cfg_system_enhance 查（ENHANCE_COST 数组长度）。
 *       若查不到 enhance 记录，maxLevel 默认为 EFFECT_PARAM_LEVEL 的最大等级或 5。
 *
 * EFFECT_ID → 引擎属性 的转译用 switch 实现，已实现的 case 见 EFFECT_HANDLERS。
 * 未实现的 EFFECT_ID 落到 unresolved[] 透明记录，不报错。
 */
import type { ClientDataStore, RawSystemEffect } from './rawTypes.js';
import { SHIP } from './rawTypes.js';
import { parseTechString, type TechModule } from './techString.js';
import { computePeakBonus } from './peakLevel.js';
import { computeTuneBonus } from './tuneSystem.js';

/** 万分比基数（A类 PARAM / PERMILLE = 百分比） */
const PERMILLE = 10000;

/** 超主力舰 ship_type 集合（战巡6/支援7/航母8/战列9），舰种由 cfg_ship[11] 判定 */
const SUPER_CAPITAL_TYPES = new Set([6, 7, 8, 9]);

/**
 * 查每科技点的结构加成系数（版本号计算用）。
 * 普通舰（护卫3/驱逐4/巡洋5）用 cfg_ship_type[9]（驱逐=40）。
 * ★超主力舰（战巡6/支援7/航母8/战列9）无版本号结构加成——cfg_ship_type[9]=0，
 *   实测印证：CV3000(航母) finalStructure=278340×1.33=370192，无版本号加成。
 *   （cfg_ship_type[10]=50 不是结构加成用途，暂不用）
 * 舰种由 cfg_ship[11]（SHIP_TYPE）确定，不靠舰名匹配。
 * 返回 0 表示该舰种无版本号加成。
 */
function lookupShipHpAdd(store: ClientDataStore, shipId: string): number {
  const shipRow = store.ship[shipId];
  if (!shipRow) return 0;
  const shipType = Number(shipRow[11] ?? 0);
  if (!shipType) return 0;
  const typeRow = store.shipType[String(shipType)];
  if (!typeRow) return 0;
  return typeRow[9] ?? 0;
}

/**
 * ★推测超主力舰装配模块的科技点（启发式，非精确）。
 *
 * ★重要：配置表无法可靠判定"初始为空"的系统槽（CV3000 反例：护航艇系统有
 * POINT_REQUIRED 但初始可能就有模块）。"初始为空"是运行时状态（玩家装配动作），
 * 应由调用方传入确切的 installPoints，而非用此函数自动推断。
 *
 * 此函数仅作启发式推测：ADDITIONAL_SYS=1 且 MAIN_SYSTEM≠1 的系统视为"可选附加系统"，
 * 若装配了模块则按切换组聚合 +10点。仅超主力舰生效。
 *
 * @returns 推测的装配科技点（可能不准，建议调用方传入 installPoints 覆盖）
 */
export function countInstallTechPoints(store: ClientDataStore, shipId: string): number {
  const shipRow = store.ship[shipId];
  if (!shipRow) return 0;
  const shipType = Number(shipRow[11] ?? 0);
  if (!SUPER_CAPITAL_TYPES.has(shipType)) return 0; // 仅超主力舰

  const shipSystem = store.shipSystem as Record<string, Record<string, unknown>> | undefined;
  const shipSlot = store.shipSlot as Record<string, unknown[]> | undefined;
  if (!shipSystem || !shipSlot) return 0;

  // 启发式：ADDITIONAL_SYS=1 且 MAIN_SYSTEM≠1 = 可选附加系统（推测为初始空）
  // 按切换组聚合（同组只算一次）
  const optionalGroupsWithInstall = new Set<string>();
  for (const slotId in shipSystem) {
    if (!slotId.startsWith(shipId) || slotId.length !== 7) continue;
    const sys = shipSystem[slotId];
    const isOptional = Number(sys.ADDITIONAL_SYS ?? 0) === 1 && Number(sys.MAIN_SYSTEM ?? 0) !== 1;
    if (!isOptional) continue;
    const group = String(sys.GROUP ?? slotId);
    // 该槽是否装配了模块（cfg_ship_slot cat=0）
    let installed = false;
    for (const slotKey in shipSlot) {
      if (!slotKey.startsWith(slotId)) continue;
      const row = shipSlot[slotKey];
      if (Number(row[0]) !== 0) continue;
      const modId = String(row[2]);
      if (modId && modId !== '0') { installed = true; break; }
    }
    if (installed) optionalGroupsWithInstall.add(group);
  }

  return optionalGroupsWithInstall.size * 10;
}

/**
 * EFFECT_ID 分类映射（用于归类未单独实现 case 的效果）。
 * 所有 EFFECT_ID 都会被收录到 effects[]，区别只在于是否聚合到具体字段。
 * 未在此映射中的 EFFECT_ID 归为 'other'（仍收录，不进 unresolved）。
 */
const EFFECT_CATEGORY: Record<number, string> = {
  // 命中类
  12006: 'hit', 12007: 'hit', 12008: 'hit', 12009: 'hit', 12011: 'hit',
  12014: 'hit', 12015: 'hit', 12018: 'hit', 12019: 'hit',
  // 伤害类
  12020: 'damage', 12021: 'damage', 12022: 'damage', 12023: 'damage',
  12024: 'damage', 12025: 'damage', 12034: 'damage', 12035: 'damage',
  12036: 'damage', 12037: 'damage', 12038: 'damage', 12039: 'damage',
  12040: 'damage', 12044: 'damage', 12045: 'damage',
  12046: 'damage', 12047: 'damage', 12048: 'damage',
  12170: 'damage', 12171: 'damage', 12360: 'damage', 12361: 'damage',
  // 暴击类
  12031: 'crit', 12042: 'crit',
  12130: 'crit', 12131: 'crit', 12132: 'crit', 12133: 'crit',
  12134: 'crit', 12135: 'crit', 12161: 'crit', 12162: 'crit',
  12320: 'crit', 12390: 'crit', 12391: 'crit',
  // 防御类
  10002: 'defense', 10003: 'defense', 10011: 'defense', 10013: 'defense',
  10014: 'defense', 10015: 'defense', 10016: 'defense',
  10020: 'defense', 10022: 'defense', 10023: 'defense', 10024: 'defense',
  10025: 'defense', 10026: 'defense', 10029: 'defense', 10030: 'defense',
  10032: 'defense', 10035: 'defense', 10040: 'defense',
  10050: 'defense', 10051: 'defense',
  10060: 'defense', 10061: 'defense', 10062: 'defense', 10063: 'defense',
  10064: 'defense', 10065: 'defense', 10066: 'defense', 10067: 'defense',
  10070: 'defense', 10080: 'defense', 10082: 'defense',
  10083: 'defense', 10084: 'defense', 10085: 'defense', 10086: 'defense',
  10087: 'defense', 10089: 'defense', 10090: 'defense', 10091: 'defense',
  10092: 'defense', 10093: 'defense', 10094: 'defense', 10095: 'defense',
  10096: 'defense', 10097: 'defense', 10098: 'defense', 10099: 'defense',
  10101: 'defense', 10102: 'defense', 10103: 'defense',
  10201: 'defense', 10202: 'defense', 10204: 'defense', 10205: 'defense',
  10206: 'defense', 10207: 'defense', 10210: 'defense', 10211: 'defense',
  10212: 'defense', 10221: 'defense', 10222: 'defense', 10230: 'defense',
  10231: 'defense', 10232: 'defense', 10233: 'defense', 10234: 'defense',
  10235: 'defense', 10236: 'defense', 10238: 'defense', 10239: 'defense',
  10240: 'defense', 10241: 'defense', 10242: 'defense',
  10539: 'defense', 10540: 'defense', 10541: 'defense', 10542: 'defense',
  10543: 'defense', 10544: 'defense', 10545: 'defense',
  // 拦截/反导类
  12083: 'intercept', 12084: 'intercept', 12090: 'intercept',
  12091: 'intercept', 12092: 'intercept', 12093: 'intercept',
  12291: 'intercept', 12292: 'intercept', 12293: 'intercept',
  12295: 'intercept', 12296: 'intercept', 12297: 'intercept', 12298: 'intercept',
  // 目标选择/攻击时序类
  12070: 'target', 12071: 'target', 12072: 'target', 12073: 'target',
  12074: 'target', 12075: 'target', 12076: 'target', 12077: 'target',
  12078: 'target', 12079: 'target',
  12110: 'target', 12140: 'target', 12141: 'target',
  12142: 'target', 12143: 'target', 12144: 'target', 12145: 'target',
  12146: 'target', 12150: 'target', 12151: 'target', 12152: 'target',
  12153: 'target', 12154: 'target', 12155: 'target', 12156: 'target',
  12157: 'target', 12158: 'target',
  12200: 'target', 12201: 'target', 12230: 'target', 12231: 'target',
  12232: 'target', 12263: 'target', 12265: 'target', 12266: 'target',
  12267: 'target', 12268: 'target', 12269: 'target',
  12280: 'target', 12281: 'target', 12282: 'target', 12283: 'target',
  12299: 'target',
  12330: 'target', 12331: 'target', 12340: 'target', 12370: 'target',
  12371: 'target', 12381: 'target',
  // 维修类
  12050: 'repair', 12051: 'repair', 12100: 'repair', 12240: 'repair',
  12249: 'repair', 12250: 'repair', 12251: 'repair', 12252: 'repair',
  12253: 'repair', 12254: 'repair', 12255: 'repair', 12256: 'repair',
  12257: 'repair', 12259: 'repair', 12502: 'repair', 12505: 'repair',
  12506: 'repair', 12507: 'repair', 12609: 'repair',
  // 攻城/对空/额外伤害类
  12060: 'siege', 12062: 'antiair', 12210: 'siege', 12211: 'siege',
  12212: 'siege', 12213: 'siege', 12214: 'siege',
  12300: 'antiair', 12301: 'antiair', 12305: 'antiair', 12306: 'antiair',
  12310: 'antiair', 12311: 'antiair',
  12411: 'antiair', 12412: 'antiair', 12413: 'antiair',
  // 技能/buff类
  10501: 'skill', 10511: 'skill', 10512: 'skill', 10513: 'skill',
  10514: 'skill', 10515: 'skill', 10516: 'skill', 10517: 'skill',
  10518: 'skill', 10519: 'skill', 10520: 'skill', 10521: 'skill',
  10522: 'skill', 10523: 'skill', 10524: 'skill', 10533: 'skill',
  10534: 'skill', 10535: 'skill',
  12401: 'skill', 12402: 'skill', 12403: 'skill', 12404: 'skill',
  12405: 'skill', 12406: 'skill', 12420: 'skill',
  12501: 'skill', 12503: 'skill', 12504: 'skill',
  12601: 'skill', 12602: 'skill', 12603: 'skill', 12604: 'skill',
  12605: 'skill', 12606: 'skill', 12607: 'skill', 12608: 'skill',
  12610: 'skill', 12611: 'skill', 12612: 'skill',
  13001: 'skill', 13002: 'skill', 13003: 'skill', 13004: 'skill',
  13005: 'skill', 13006: 'skill', 13007: 'skill', 13008: 'skill',
  13009: 'skill', 13010: 'skill', 13011: 'skill', 13012: 'skill',
  13013: 'skill', 13014: 'skill', 13021: 'skill', 13022: 'skill',
  13023: 'skill', 13024: 'skill', 13025: 'skill',
  // 旗舰技能类
  2059: 'flagship', 2060: 'flagship', 2061: 'flagship', 2062: 'flagship',
  2063: 'flagship', 2064: 'flagship', 2065: 'flagship', 2066: 'flagship',
  2067: 'flagship', 2068: 'flagship', 2069: 'flagship', 2070: 'flagship',
  2071: 'flagship', 2072: 'flagship', 2073: 'flagship', 2074: 'flagship',
  2075: 'flagship', 2076: 'flagship', 2077: 'flagship', 2078: 'flagship',
  2079: 'flagship', 2080: 'flagship', 2081: 'flagship', 2082: 'flagship',
  2083: 'flagship', 2084: 'flagship', 2085: 'flagship', 2086: 'flagship',
  2087: 'flagship', 2088: 'flagship', 2089: 'flagship', 2090: 'flagship',
  // 生产/经济/非战斗类
  3: 'economy', 4: 'economy', 5: 'economy', 8: 'economy', 9: 'economy',
  14: 'economy', 16: 'economy', 20: 'economy', 21: 'economy', 30: 'economy',
  31: 'economy', 40: 'economy', 50: 'economy', 60: 'economy', 70: 'economy',
  80: 'economy', 90: 'economy', 100: 'economy',
  101: 'economy', 102: 'economy', 103: 'economy', 104: 'economy',
  105: 'economy', 106: 'economy', 107: 'economy', 108: 'economy',
  2020: 'economy', 2021: 'economy', 2022: 'economy', 2023: 'economy',
  2024: 'economy',
  2030: 'economy', 2031: 'economy', 2032: 'economy', 2033: 'economy',
  2034: 'economy', 2035: 'economy', 2040: 'economy', 2041: 'economy',
  2042: 'economy', 2043: 'economy', 2044: 'economy', 2045: 'economy',
  2046: 'economy', 2047: 'economy', 2048: 'economy', 2049: 'economy',
  2050: 'economy', 2051: 'economy', 2053: 'economy', 2054: 'economy',
  2055: 'economy', 2056: 'economy', 2057: 'economy', 2058: 'economy',
  71001: 'economy', 71002: 'economy', 71003: 'economy', 71004: 'economy',
  71005: 'economy', 71006: 'economy', 71010: 'economy', 71020: 'economy',
  // 其他特殊
  10001: 'other', 10034: 'other',
  3000: 'other', 20010: 'other', 21001: 'other',
  50001: 'other', 70001: 'other',
};

/**
 * 蓝图外部参数（非科技串来源的加成）。
 *
 * 版本号和巅峰等级的结构加成属于蓝图等级/巅峰系统的产物，不在科技串里。
 *
 * ★版本号公式（已确认，来自 cfg_ship_type）：
 *   versionStructureBonus = techPoints × shipHpAdd
 *   shipHpAdd = cfg_ship_type[shipType][9]（每技术值点的结构加成）
 *   主力舰（护卫20/驱逐40/巡洋60）有值，超主力舰（战巡/航母/战列）=0 不走此机制。
 *   若提供 techPoints + shipHpAdd，resolver 自动计算；也可直接提供 versionStructureBonus。
 *
 * ★巅峰等级加成（2026-07-03 突破，见 peakLevel.ts）：
 *   提供巅峰等级后，resolver 从 cfg_ship_peak_level 查强化快照，
 *   查船级专属 effect 表 cfg_system_effect[slotId+"01"].EFFECT_PARAM_LEVEL 取各级数值：
 *     - EFFECT_ID=12 龙骨结构增强（绝对值，每级都有）
 *     - EFFECT_ID=14 引擎出力（常规移速，特定巅峰等级）
 *     - EFFECT_ID=16 曲率引擎（曲率移速，特定巅峰等级）
 *   例：ST59(shipId 60301)巅峰16级 = +52680结构（查603010101第16行）。
 *   调校系统（70号槽）属独立系统，本次不实装。
 */
export interface BlueprintOptions {
  /**
   * 巅峰等级（1-20）。提供后 resolver 自动从 cfg_ship_peak_level 聚合
   * 结构绝对值加成和移速加成。无需手动算 peakStructureBonus。
   */
  peakLevel?: number;
  /** 版本号结构加成（绝对值，优先级最高，直接使用） */
  versionStructureBonus?: number;
  /** 技术值点数（用于自动计算版本号，需配合 shipHpAdd） */
  techPoints?: number;
  /** 每技术值点的结构加成（cfg_ship_type[shipType][9]，如驱逐舰=40） */
  shipHpAdd?: number;
  /**
   * ★模块结构加成（Layer1，绝对值）。
   * 来自装甲模块 cfg_module_effect 的 EID=10 万分比 × baseStructure。
   * 强化系数(permille)作用于 baseStructure + moduleStructureBonus（完整骨架）。
   * 默认 0（向后兼容：不提供则强化只作用于出厂基础值）。
   */
  moduleStructureBonus?: number;
  /**
   * ★调校槽等级映射 { enhanceId: level(0-10) }。
   * 提供后 resolver 聚合调校加成（结构/伤害/命中/拦截/维修），按 EFFECT_ID 分发。
   * 调校生效需对应目标强化项已点等级（见 enhanceLevels）。
   */
  tuneLevels?: Record<string, number>;
  /**
   * ★普通强化项等级映射 { enhanceId: level }。
   * 用于调校前提门控（调校生效需其 targetEnhanceId 已点等级）。
   * 不提供时调校门控降级为不检查。
   */
  enhanceLevels?: Record<string, number>;
  /**
   * ★装配模块科技点（超主力舰初始空系统首次装配 +10/组）。
   * 由调用方传入确切的玩家装配记录（运行时状态）。
   * 不提供时用 countInstallTechPoints 启发式推测（可能不准）。
   */
  installPoints?: number;
}

/** 一个解析后的效果（已取出 EFFECT_ID 与按等级缩放后的数值） */
export interface ResolvedEffect {
  /** 来源科技模块（便于追溯） */
  tech: TechModule;
  /** 效果类型 ID（决定机制） */
  effectId: number;
  /** 效果名（中文） */
  name: string;
  /** 数值（已按 level 缩放，单位取决于机制） */
  value: number;
  /** 效果分类（hit/damage/crit/defense/intercept/target/repair/siege/antiair/skill/flagship/economy/other） */
  category: string;
  /** 满级值（PARAM 或 PARAM_LEVEL 最大值，便于审查） */
  maxParamValue: number;
  /** 该强化的最大等级（来自 ENHANCE_COST 长度） */
  maxLevel: number;
  /** 数值来源：param_level=等级表 / direct=直接PARAM */
  source: 'param_level' | 'direct' | 'enhance_values';
}

/** 未实现的效果（EFFECT_ID 无对应 handler），透明记录便于后续扩展 */
export interface UnresolvedEffect {
  tech: TechModule;
  effectId: number;
  name: string;
  reason: string;
}

/**
 * 蓝图解析结果（里程碑2：含全面板属性）
 */
export interface ResolvedBlueprint {
  shipId: string;
  baseStructure: number;
  /** ★模块结构加成绝对值（Layer1，EID=10 万分比 × base） */
  moduleStructureBonus: number;
  /** 强化后结构值 = (base+moduleBonus)×(1+Σ结构万分比/10000) + 巅峰结构绝对值 + 版本号绝对值 */
  finalStructure: number;
  /** 结构强化的万分比合计（不含巅峰/版本号绝对值） */
  structureBonusPermille: number;

  /** ★巅峰等级（0=无巅峰，1-20）。来自 BlueprintOptions.peakLevel */
  peakLevel: number;
  /** ★巅峰结构加成（绝对值，来自龙骨结构增强 EFFECT_ID=12，每级都有） */
  peakStructureBonus: number;
  /** ★巅峰强化奖励的结构加成（万分比，来自 field[1] EFFECT_ID=10，暂不自动叠加到 finalStructure，待实测确认） */
  peakRewardStructurePermille: number;
  /** ★巅峰常规移速加成（万分比，来自引擎出力 EFFECT_ID=14，特定巅峰等级） */
  peakSpeedBonus: number;
  /** ★巅峰曲率移速加成（万分比，来自曲率引擎 EFFECT_ID=16，特定巅峰等级） */
  peakCurvatureSpeedBonus: number;

  /** 物理抵抗加成（绝对值，叠加到基础抵抗） */
  resistanceBonus: number;

  /** 命中加成（按目标舰种，万分比） */
  hitBonusByTargetClass: Partial<Record<string, number>>;
  /** 通用命中加成（万分比） */
  hitBonus: number;
  /** 闪避率加成（万分比） */
  dodgeBonus: number;

  /** 系统内武器伤害提升（万分比，按 systemLabel 分组） */
  weaponDamageBonus: Record<string, number>;
  /** 武器冷却下降（万分比，按 systemLabel 分组） */
  weaponCooldownReduction: Record<string, number>;
  /** 常规移动速度提升（万分比，加法叠加） */
  speedBonus: number;
  /** 曲率移动速度提升（万分比，加法叠加） */
  curvatureSpeedBonus: number;

  /** 单体暴击率（万分比，B类缩放后） */
  critRate: number;
  /** 单体暴击额外伤害（万分比，如5000=额外50%=总倍率1.5） */
  critDamage: number;
  /** 对空暴击率（万分比） */
  antiAirCritRate: number;
  /** 对空暴击额外伤害（万分比） */
  antiAirCritDamage: number;
  /** 暴击伤害提升（万分比，叠加到暴击额外伤害） */
  critDamageBonus: number;

  /** 能量伤害抵抗/护盾（万分比，能量减伤百分比） */
  energyResistance: number;
  /** 物理伤害下降百分比（万分比，区别于绝对值抵抗） */
  physicalDamageReduction: number;
  /** 受指定武器类型闪避提升（按武器类别，万分比） */
  dodgeByWeaponType: Record<string, number>;

  /** 单发基础攻击力提升（绝对值，+dph） */
  baseDamageBonus: number;
  /** 攻城伤害提升（万分比） */
  siegeDamageBonus: number;
  /** 对空伤害提升（万分比） */
  antiAirDamageBonus: number;
  /** 系统结构值提升（万分比，子系统HP） */
  systemStructureBonus: number;

  /** 拦截/反导：导弹拦截率（万分比） */
  interceptRate: number;
  /** 被拦截几率降低（万分比，投射武器自身） */
  interceptEvade: number;
  /** 命中优先级提升（原始值，目标选择权重） */
  targetPriorityBonus: number;
  /** 选择目标时间降低（万分比，锁定速度提升） */
  targetLockTimeReduction: number;
  /** 攻击持续时间提高（万分比） */
  attackDurationBonus: number;
  /** 攻击持续时间降低/打击间隔缩短（万分比） */
  attackDurationReduction: number;
  /** 攻击次数增加（额外弹数） */
  attackCountBonus: number;
  /** 飞行时间降低（万分比，投射武器） */
  flightTimeReduction: number;
  /** 是否启用集火（旗舰策略） */
  focusFire: boolean;
  /** 系统自维修标记（是否具备自动维修能力） */
  hasAutoRepair: boolean;

  /** ★维修效率提升（万分比，来自 EFFECT_ID=12050/12249） */
  repairEfficiencyBonus: number;
  /** ★损坏后自动维修触发（EFFECT_ID=12250，区别于效率提升） */
  hasDamageRepair: boolean;

  /** 全部解析出的效果（含已实现与未实现） */
  effects: ResolvedEffect[];
  /** 未实现的 EFFECT（透明记录） */
  unresolved: UnresolvedEffect[];
}

/** 从 systemEnhance 查 maxLevel（ENHANCE_COST 数组长度）。
 * 用 enhanceId 直接查找（由 parseTechString 计算 = slotId + optIdx补零2位）。
 */
function findMaxLevel(
  store: ClientDataStore,
  tech: TechModule
): number {
  const enhance = store.systemEnhance[tech.enhanceId];
  if (enhance) return enhance.ENHANCE_COST?.length ?? 5;
  return 5; // 默认5级
}

/** 取 PARAM 的"有效后缀"作为满级值。多位编码类取后2位，其他取整个值 */
function extractParamValue(effectId: number, param: number | undefined): number {
  if (param === undefined) return 0;
  // 12012 命中类 / 10012 武器闪避类：PARAM 多位编码（如3015），取后2位（=15）
  if (effectId === 12012 || effectId === 10012) {
    const s = String(param);
    return Number(s.slice(-2));
  }
  return param;
}

/**
 * 拆分暴击类 PARAM（12030/12029/12031 等）。
 * 编码规则：PARAM = 暴击概率(%) × 1000 + 额外伤害(%)
 * 例：30050 → 概率30%，额外伤害50%；40050 → 40%，50%
 */
function splitCritParam(param: number | undefined): { critRate: number; critDamage: number } {
  if (param === undefined) return { critRate: 0, critDamage: 0 };
  return {
    critRate: Math.floor(param / 1000), // 暴击概率 %
    critDamage: param % 1000, // 额外伤害 %
  };
}

/** 查找效果并计算按等级缩放后的数值 */
interface EffectLookup {
  effect: RawSystemEffect;
  value: number; // 已按level缩放
  maxParamValue: number; // 满级值
  source: 'param_level' | 'direct' | 'enhance_values';
}

function lookupEffect(
  store: ClientDataStore,
  tech: TechModule
): EffectLookup | null {
  const { systemEffect } = store;
  const prefix = String(tech.techId);
  const level = tech.level;
  const maxLevel = findMaxLevel(store, tech);
  // ★enhance_values 表（frida dump，解决 EFFECT_PARAM 空的伤害类数值来源）
  const enhanceValues = (store as any).enhanceValues as
    | Record<string, Record<string, { value: number; effect_id: number | null }>>
    | undefined;

  // 1. direct：尝试 PREFIX + level补零2位
  const directKey = prefix + String(level).padStart(2, '0');
  const direct = systemEffect[directKey];
  if (direct) {
    const effectId = direct.EFFECT_ID ?? -1;
    // B类：按等级缩放
    const maxParamValue = extractParamValue(effectId, direct.EFFECT_PARAM);
    let value = direct.EFFECT_PARAM_LEVEL
      ? lookupParamLevel(direct.EFFECT_PARAM_LEVEL, level) // A类查表
      : maxParamValue * level / maxLevel; // B类缩放
    // ★回退：value=0 或 effectId 无效时查 enhance_values 表
    if ((!value || effectId === -1) && enhanceValues && tech.enhanceId) {
      const lvEntry = enhanceValues[tech.enhanceId]?.[String(level)];
      if (lvEntry) {
        value = lvEntry.value;
        const eid = lvEntry.effect_id ?? undefined;
        const effectWithId = eid !== undefined ? { ...direct, EFFECT_ID: eid } as typeof direct : direct;
        return { effect: effectWithId, value, maxParamValue: value, source: 'enhance_values' };
      }
    }
    return { effect: direct, value, maxParamValue, source: direct.EFFECT_PARAM_LEVEL ? 'param_level' : 'direct' };
  }

  // 2. 用基础条目 PREFIX + '01'
  const baseKey = prefix + '01';
  const base = systemEffect[baseKey];
  if (!base) return null;

  const effectId = base.EFFECT_ID ?? -1;

  // A类：有等级表
  if (base.EFFECT_PARAM_LEVEL) {
    const value = lookupParamLevel(base.EFFECT_PARAM_LEVEL, level);
    // PARAM_LEVEL 的满级值取最后一级
    const levels = parseParamLevel(base.EFFECT_PARAM_LEVEL);
    const maxParamValue = levels.length > 0 ? levels[levels.length - 1][1] : value;
    return { effect: base, value, maxParamValue, source: 'param_level' };
  }

  // B类：按等级缩放
  const maxParamValue = extractParamValue(effectId, base.EFFECT_PARAM);
  let value = (maxParamValue * level) / maxLevel;

  // ★回退：若 value=0 或 effectId 无效（PARAM 空的伤害类），查 enhance_values 表
  if ((!value || effectId === -1) && enhanceValues && tech.enhanceId) {
    const lvEntry = enhanceValues[tech.enhanceId]?.[String(level)];
    if (lvEntry) {
      value = lvEntry.value;
      // 用表里的 effect_id 覆盖（base.EFFECT_ID 可能是 null）
      const eid = lvEntry.effect_id ?? undefined;
      const effectWithId = eid !== undefined
        ? { ...base, EFFECT_ID: eid } as typeof base
        : base;
      return { effect: effectWithId, value, maxParamValue: value, source: 'enhance_values' };
    }
  }

  return { effect: base, value, maxParamValue, source: 'direct' };
}

/** 解析 EFFECT_PARAM_LEVEL "1,200;2,400;..." 为 [level,value][] */
function parseParamLevel(paramLevel: string): Array<[number, number]> {
  return paramLevel
    .split(';')
    .filter((s) => s.trim().length > 0)
    .map((entry) => {
      const [lv, val] = entry.split(',').map(Number);
      return [lv, val] as [number, number];
    });
}

/** 从 PARAM_LEVEL 取指定 level 的值 */
function lookupParamLevel(paramLevel: string, level: number): number {
  for (const [lv, val] of parseParamLevel(paramLevel)) {
    if (lv === level) return val;
  }
  return 0;
}

/**
 * 解析蓝图：科技串 → 强化效果 → 强化后数值。
 *
 * @param store 配置表存储
 * @param shipId 舰船 ID（5位）
 * @param techStr 战报科技串
 * @param options 可选：巅峰等级/技术值等外部参数（产出蓝图等级和巅峰等级的结构加成）
 * @returns 蓝图解析结果（含全面板属性）
 */
export function resolveBlueprint(
  store: ClientDataStore,
  shipId: string,
  techStr: string,
  options?: BlueprintOptions
): ResolvedBlueprint {
  const modules = parseTechString(techStr);
  const effects: ResolvedEffect[] = [];
  const unresolved: UnresolvedEffect[] = [];

  const shipRow = store.ship[shipId];
  const baseStructure = shipRow ? shipRow[SHIP.STRUCTURE] : 0;

  // 聚合容器
  let structureBonusPermille = 0;
  let resistanceBonus = 0;
  let hitBonus = 0;
  let dodgeBonus = 0;
  const hitBonusByTargetClass: Record<string, number> = {};
  const weaponDamageBonus: Record<string, number> = {};
  const weaponCooldownReduction: Record<string, number> = {};
  let speedBonus = 0;
  let curvatureSpeedBonus = 0;

  // 暴击类
  let critRate = 0;
  let critDamage = 0;
  let antiAirCritRate = 0;
  let antiAirCritDamage = 0;
  let critDamageBonus = 0;
  // 防御类
  let energyResistance = 0;
  let physicalDamageReduction = 0;
  const dodgeByWeaponType: Record<string, number> = {};
  // 伤害类
  let baseDamageBonus = 0;
  let siegeDamageBonus = 0;
  let antiAirDamageBonus = 0;
  let systemStructureBonus = 0;
  // 拦截/目标选择/攻击时序类
  let interceptRate = 0;
  let interceptEvade = 0;
  let targetPriorityBonus = 0;
  let targetLockTimeReduction = 0;
  let attackDurationBonus = 0;
  let attackDurationReduction = 0;
  let attackCountBonus = 0;
  let flightTimeReduction = 0;
  let focusFire = false;
  let hasAutoRepair = false;
  // 维修类
  let repairEfficiencyBonus = 0; // 维修效率提升（万分比，12050/12249）
  let hasDamageRepair = false; // 损坏后自动维修触发（12250）
  for (const tech of modules) {
    const lookup = lookupEffect(store, tech);
    if (!lookup) {
      unresolved.push({
        tech,
        effectId: -1,
        name: '(system_effect 未找到)',
        reason: `techId=${tech.techId} 在 system_effect 中无记录`,
      });
      continue;
    }

    const effectId = lookup.effect.EFFECT_ID ?? -1;
    const resolved: ResolvedEffect = {
      tech,
      effectId,
      name: lookup.effect.NAME ?? '(无名)',
      value: lookup.value,
      category: EFFECT_CATEGORY[effectId] ?? 'other',
      maxParamValue: lookup.maxParamValue,
      maxLevel: findMaxLevel(store, tech),
      source: lookup.source,
    };

    // 按 EFFECT_ID 分发
    switch (effectId) {
      case 10: // 舰船结构值提高（A类，万分比加法叠加）
        structureBonusPermille += lookup.value;
        effects.push(resolved);
        break;

      case 10033: // 物理伤害抵抗提高（B类，绝对值加法）
        resistanceBonus += lookup.value;
        effects.push(resolved);
        break;

      case 10010: // 闪避率提升（B类，万分比）
        dodgeBonus += lookup.value * 100; // % → 万分比
        effects.push(resolved);
        break;

      case 12012: {
        // 对护卫舰/驱逐舰（或战机/护航艇）命中提升（B类，万分比）
        // 目标类型判断：优先用 DESC，DESC 缺失时用 techId 前缀 fallback
        //   201/202 = 战机/护航艇, 203/204 = 护卫舰/驱逐舰
        const desc = String(lookup.effect.DESC ?? '');
        let targetClass = 'unknown';
        if (/护卫舰|驱逐舰/.test(desc)) targetClass = 'frigate_destroyer';
        else if (/战机|护航艇/.test(desc)) targetClass = 'fighter_corvette';
        else if (tech.techId === 201 || tech.techId === 202) targetClass = 'fighter_corvette';
        else if (tech.techId === 203 || tech.techId === 204) targetClass = 'frigate_destroyer';
        hitBonusByTargetClass[targetClass] = (hitBonusByTargetClass[targetClass] ?? 0) + lookup.value * 100;
        effects.push(resolved);
        break;
      }

      case 12010: // 通用命中率提升（万分比）
        hitBonus += lookup.value * 100;
        effects.push(resolved);
        break;

      case 12041: {
        // 系统内武器冷却时间下降（B类，万分比）。按系统分组
        const label = String(lookup.effect.TARGET_MODULE_TYPE ?? 'main');
        weaponCooldownReduction[label] = (weaponCooldownReduction[label] ?? 0) + lookup.value * 100;
        effects.push(resolved);
        break;
      }

      case 1: // 常规移动速度提升（B类，万分比）
        speedBonus += lookup.value * 100;
        effects.push(resolved);
        break;

      case 2: // 曲率移动速度提升（B类，万分比）
        curvatureSpeedBonus += lookup.value * 100;
        effects.push(resolved);
        break;

      // ===== 暴击类 =====
      case 12030: {
        // 单体暴击：PARAM = 概率×1000 + 额外伤害%
        const raw = lookup.effect.EFFECT_PARAM ?? lookup.value * 1000;
        const { critRate: r, critDamage: d } = splitCritParam(raw);
        critRate += r * 100; // % → 万分比
        if (d > 0) critDamage = Math.max(critDamage, d * 100); // 取最高额外伤害
        effects.push(resolved);
        break;
      }
      case 12029: {
        // 对空暴击：PARAM = 概率×1000 + 额外伤害%
        const raw = lookup.effect.EFFECT_PARAM ?? lookup.value * 1000;
        const { critRate: r, critDamage: d } = splitCritParam(raw);
        antiAirCritRate += r * 100;
        if (d > 0) antiAirCritDamage = Math.max(antiAirCritDamage, d * 100);
        effects.push(resolved);
        break;
      }
      case 12032: // 暴击伤害提升（B类，万分比）
        critDamageBonus += lookup.value * 100;
        effects.push(resolved);
        break;
      case 12033: // 系统受到暴击伤害下降（B类，万分比）—— 防御向，暂归 critDamageBonus 负值
        effects.push(resolved);
        break;

      // ===== 防御类 =====
      case 10021: // 能量伤害抵抗/护盾提高（B类，万分比）。PARAM 可能 undefined，用 lookup.value
        energyResistance += lookup.value * 100;
        effects.push(resolved);
        break;
      case 10031: // 物理伤害下降百分比（B类，万分比）
        physicalDamageReduction += lookup.value * 100;
        effects.push(resolved);
        break;
      case 10012: {
        // 受指定武器闪避提升（B类，万分比）。PARAM 多位编码取后2位
        // 武器类别判断：DESC 含"直射/导弹/鱼雷"等
        const desc = String(lookup.effect.DESC ?? '');
        let wType = 'direct';
        if (/导弹/.test(desc)) wType = 'guided';
        else if (/鱼雷/.test(desc)) wType = 'guided';
        else if (/直射/.test(desc)) wType = 'direct';
        dodgeByWeaponType[wType] = (dodgeByWeaponType[wType] ?? 0) + lookup.value * 100;
        effects.push(resolved);
        break;
      }

      // ===== 伤害类 =====
      case 12350: // 单发基础攻击力提升（B类，绝对值 +dph）
        baseDamageBonus += lookup.value;
        effects.push(resolved);
        break;
      case 12060: // 攻城伤害提高（B类，万分比）
        siegeDamageBonus += lookup.value * 100;
        effects.push(resolved);
        break;
      case 12062: // 对空伤害提高（B类，万分比）
        antiAirDamageBonus += lookup.value * 100;
        effects.push(resolved);
        break;
      case 1010: // 系统结构值提高（B类，万分比，子系统HP）
        systemStructureBonus += lookup.value * 100;
        effects.push(resolved);
        break;
      case 12251: // 持续攻击伤害提升（特殊机制，万分比）
        effects.push(resolved);
        break;

      // ===== 拦截/反导类 =====
      case 12080: // 获得拦截能力（PARAM=5002: {102}=导弹拦截率2%）
      case 12081: {
        // 提升拦截率（PARAM=5025: {102}=25%）
        // PARAM 多位编码，取 {102}=后2位（与12012/10012同规则）
        const param = lookup.effect.EFFECT_PARAM;
        const rate = param != null ? Number(String(param).slice(-2)) : lookup.value;
        interceptRate += rate * 100 * lookup.value / (lookup.maxParamValue || rate);
        effects.push(resolved);
        break;
      }
      case 12082: // 被拦截几率降低（B类，万分比）
        interceptEvade += lookup.value * 100;
        effects.push(resolved);
        break;

      // ===== 目标选择类 =====
      case 12070: // 命中优先级提升（原始权重值）
        targetPriorityBonus += lookup.value;
        effects.push(resolved);
        break;
      case 12090: // 选择目标时间降低（B类，万分比）
        targetLockTimeReduction += lookup.value * 100;
        effects.push(resolved);
        break;
      case 12263: // 默认集火（旗舰）
        focusFire = true;
        effects.push(resolved);
        break;

      // ===== 攻击时序类 =====
      case 12140: // 攻击持续时间提高（B类，万分比）
        attackDurationBonus += lookup.value * 100;
        effects.push(resolved);
        break;
      case 12141: // 攻击持续时间降低/打击间隔缩短（B类，万分比）
        attackDurationReduction += lookup.value * 100;
        effects.push(resolved);
        break;
      case 12142: // 攻击次数增加（绝对值，额外弹数）
        attackCountBonus += lookup.value;
        effects.push(resolved);
        break;
      case 12294: // 飞行时间降低（B类，万分比，投射武器）
        flightTimeReduction += lookup.value * 100;
        effects.push(resolved);
        break;

      // ===== 系统维修类 =====
      case 12270: // 系统自维修/损坏伤害
        hasAutoRepair = true;
        effects.push(resolved);
        break;
      case 12050: // 系统维修效果提升（A类，PARAM_LEVEL查表，值为百分比）
        // PARAM_LEVEL 如 "1,2;2,4;...;5,10"，value 已按 level 查表（如 lv3=6）
        repairEfficiencyBonus += lookup.value * 100; // % → 万分比
        effects.push(resolved);
        break;
      case 12249: // 系统自维修强化（B类，PARAM=25，提升维修效率25%）
        repairEfficiencyBonus += lookup.value * 100; // % → 万分比
        effects.push(resolved);
        break;
      case 12250: // 系统损毁后自动维修（触发型机制，非效率提升）
        hasDamageRepair = true;
        effects.push(resolved);
        break;

      default:
        // 检查是否为"系统内伤害提升"类（无EFFECT_ID，靠DESC识别）
        if (isWeaponDamageEffect(lookup.effect)) {
          const label = String(lookup.effect.TARGET_MODULE_TYPE ?? 'main');
          weaponDamageBonus[label] = (weaponDamageBonus[label] ?? 0) + lookup.value * 100;
          effects.push(resolved);
          break;
        }
        // 所有其他 EFFECT_ID：按分类映射归类收录，不进 unresolved
        // 分类用于后续按类别查询，数值已记录在 resolved.value 中
        effects.push(resolved);
        break;
    }
  }

  // ★巅峰等级加成（从 cfg_ship_peak_level 聚合）
  //   field[0]: EFFECT_ID=12/14/16 (结构绝对值 + 移速万分比) —— 普通强化项等级给定
  //   field[1]: EFFECT_ID=10/12350/12050 等 (巅峰专属强化项) —— 独立加成，与 field[0] 叠加
  //
  // ★架构定位：resolveBlueprint 是"蓝图态→聚合数值"的转换器（客户端聚合职责）。
  //   面板结构值 = 各来源（模块基础 + 强化 + 调校 + 巅峰 + 版本号）聚合后的总值。
  //   field[1] 的结构万分比(EID=10)是合法来源，应叠加到强化系数。
  const peakLevel = options?.peakLevel ?? 0;
  const peakBonus = computePeakBonus(store, shipId, peakLevel);
  // 巅峰移速加成叠加到普通移速加成（均为万分比）
  speedBonus += peakBonus.speedBonus;
  curvatureSpeedBonus += peakBonus.curvatureSpeedBonus;
  // ★巅峰强化奖励的结构万分比(EID=10)叠加到强化系数——作用于 skeleton
  structureBonusPermille += peakBonus.reward.structurePermille;
  const peakRewardStructurePermille = peakBonus.reward.structurePermille;

  // ★调校系统加成（tuneSystem，optIdx=31-43）
  //   前提门控：调校生效需目标强化项已点等级（enhanceLevels）
  //   效果按 EFFECT_ID 分发：结构/伤害/命中/拦截/维修
  const tuneLevels = options?.tuneLevels;
  const tuneBonus = tuneLevels && Object.keys(tuneLevels).length > 0
    ? computeTuneBonus(store, shipId, tuneLevels, options?.enhanceLevels)
    : null;
  if (tuneBonus) {
    // 调校结构万分比(EID=10)叠加到强化系数——作用于 skeleton
    structureBonusPermille += tuneBonus.structureBonusPermille;
    // 其他加成叠加到对应字段
    baseDamageBonus += tuneBonus.damageBonusPermille; // 伤害万分比近似为+dph（简化）
    hitBonus += tuneBonus.hitBonusPermille;
    interceptRate += tuneBonus.interceptRate;
    repairEfficiencyBonus += tuneBonus.repairBonusPermille;
  }

  // ★分层结构计算：
  //   Layer0 baseStructure（cfg_ship[4]，出厂值，绝对不改）
  //   Layer1 moduleStructureBonus（装甲模块 EID=10 万分比 × base，调用方传入）
  //   skeleton = Layer0 + Layer1（强化系数作用基准——强化作用于完整骨架）
  //   Layer2 强化/巅峰/技术值 → finalStructure
  const moduleStructureBonus = options?.moduleStructureBonus ?? 0;
  const skeletonStructure = baseStructure + moduleStructureBonus;

  // finalStructure = floor(skeleton × (1+Σ万分比/10000)) + 巅峰结构绝对值 + 版本号绝对值
  // 用 floor（向下取整）：36040×1.09=39283.6 → 39283（游戏面板行为）
  // ★版本号计算（总科技点 × 每点结构加成）：
  //   总科技点 = 强化项消耗点(techPoints) + 装配点(countInstallTechPoints)
  //   - 强化项消耗：所有强化项 ENHANCE_COST 累计（不区分效果是否生效）
  //   - 装配点：超主力舰每个有装配的切换组 +10（普通舰=0）
  //   每点结构加成：普通舰 cfg_ship_type[9]，超主力舰 [10]=50
  //   优先级：直接提供 versionStructureBonus > 自动计算
  let versionBonus = options?.versionStructureBonus ?? 0;
  if (versionBonus === 0) {
    const enhancePoints = options?.techPoints ?? 0;
    // 装配点：调用方传入确切值（运行时状态，配置表无法可靠判定）。
    // 不传时默认0（不自动推测，避免误算）。需要时调用 countInstallTechPoints 显式获取推测值。
    const installPoints = options?.installPoints ?? 0;
    const totalTechPoints = enhancePoints + installPoints;
    if (totalTechPoints > 0) {
      const shipHpAdd = options?.shipHpAdd ?? lookupShipHpAdd(store, shipId);
      versionBonus = totalTechPoints * shipHpAdd;
    }
  }
  const finalStructure = Math.floor(skeletonStructure * (1 + structureBonusPermille / PERMILLE)) + peakBonus.structureAbsolute + versionBonus;

  return {
    shipId,
    baseStructure,
    moduleStructureBonus,
    finalStructure,
    structureBonusPermille,
    peakLevel,
    peakStructureBonus: peakBonus.structureAbsolute,
    peakRewardStructurePermille,
    peakSpeedBonus: peakBonus.speedBonus,
    peakCurvatureSpeedBonus: peakBonus.curvatureSpeedBonus,
    resistanceBonus,
    hitBonusByTargetClass,
    hitBonus,
    dodgeBonus,
    weaponDamageBonus,
    weaponCooldownReduction,
    speedBonus,
    curvatureSpeedBonus,
    critRate,
    critDamage,
    antiAirCritRate,
    antiAirCritDamage,
    critDamageBonus,
    energyResistance,
    physicalDamageReduction,
    dodgeByWeaponType,
    baseDamageBonus,
    siegeDamageBonus,
    antiAirDamageBonus,
    systemStructureBonus,
    interceptRate,
    interceptEvade,
    targetPriorityBonus,
    targetLockTimeReduction,
    attackDurationBonus,
    attackDurationReduction,
    attackCountBonus,
    flightTimeReduction,
    focusFire,
    hasAutoRepair,
    repairEfficiencyBonus,
    hasDamageRepair,
    effects,
    unresolved,
  };
}

/** 判断是否为"系统内武器伤害提升"类效果（无EFFECT_ID，靠DESC/NAME识别） */
function isWeaponDamageEffect(effect: RawSystemEffect): boolean {
  if (effect.EFFECT_ID !== undefined) return false;
  const desc = String(effect.DESC ?? '');
  const label = String(effect.EFFECT_LABEL ?? '');
  return /伤害提升|伤害提高/.test(desc) || label === '伤害';
}
