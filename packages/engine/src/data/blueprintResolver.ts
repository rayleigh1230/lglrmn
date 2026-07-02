/**
 * 蓝图解析器（核心）—— 把战报科技串解析成强化效果，并计算出强化后的数值。
 *
 * 解析链路（docs/11，已由 斗牛级全面板 + CV3000 双重验证）：
 *   战报科技串三元组 (subType, techId, level)
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

/** 万分比基数（A类 PARAM / PERMILLE = 百分比） */
const PERMILLE = 10000;

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
  /** 满级值（PARAM 或 PARAM_LEVEL 最大值，便于审查） */
  maxParamValue: number;
  /** 该强化的最大等级（来自 ENHANCE_COST 长度） */
  maxLevel: number;
  /** 数值来源：param_level=等级表 / direct=直接PARAM */
  source: 'param_level' | 'direct';
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
  /** 强化后结构值 = base×(1+Σ结构万分比/10000) + 巅峰/版本号绝对值加成 */
  finalStructure: number;
  /** 结构强化的万分比合计（不含巅峰/版本号绝对值） */
  structureBonusPermille: number;

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

  /** 全部解析出的效果（含已实现与未实现） */
  effects: ResolvedEffect[];
  /** 未实现的 EFFECT（透明记录） */
  unresolved: UnresolvedEffect[];
}

/** 从 systemEnhance 查 maxLevel（ENHANCE_COST 数组长度） */
function findMaxLevel(
  store: ClientDataStore,
  tech: TechModule
): number {
  // enhance id = shipId(5) + slot(2) + optIdx(2). 但战报只有 slotId(7位=shipId5+slot2)
  // 需遍历该 slot 下所有 enhance，找 SYSTEM_EFFECT_PREFIX === techId 的记录
  const slotPrefix = tech.slotId; // 7位: shipId(5)+slot(2)
  for (const [enhanceId, enhance] of Object.entries(store.systemEnhance)) {
    if (!enhanceId.startsWith(slotPrefix)) continue;
    if (enhance.SYSTEM_EFFECT_PREFIX === tech.techId) {
      return enhance.ENHANCE_COST?.length ?? 5;
    }
  }
  return 5; // 默认5级
}

/** 取 PARAM 的"有效后缀"作为满级值。12012 命中类取后2位，其他取整个值 */
function extractParamValue(effectId: number, param: number | undefined): number {
  if (param === undefined) return 0;
  // 12012 命中类：PARAM 是多位编码（如3015），取后2位（=15）
  if (effectId === 12012) {
    const s = String(param);
    return Number(s.slice(-2));
  }
  return param;
}

/** 查找效果并计算按等级缩放后的数值 */
interface EffectLookup {
  effect: RawSystemEffect;
  value: number; // 已按level缩放
  maxParamValue: number; // 满级值
  source: 'param_level' | 'direct';
}

function lookupEffect(
  store: ClientDataStore,
  tech: TechModule
): EffectLookup | null {
  const { systemEffect } = store;
  const prefix = String(tech.techId);
  const level = tech.level;
  const maxLevel = findMaxLevel(store, tech);

  // 1. direct：尝试 PREFIX + level补零2位
  const directKey = prefix + String(level).padStart(2, '0');
  const direct = systemEffect[directKey];
  if (direct) {
    const effectId = direct.EFFECT_ID ?? -1;
    // B类：按等级缩放
    const maxParamValue = extractParamValue(effectId, direct.EFFECT_PARAM);
    const value = direct.EFFECT_PARAM_LEVEL
      ? lookupParamLevel(direct.EFFECT_PARAM_LEVEL, level) // A类查表
      : maxParamValue * level / maxLevel; // B类缩放
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
  const value = (maxParamValue * level) / maxLevel;
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
 * @returns 蓝图解析结果（含全面板属性）
 */
export function resolveBlueprint(
  store: ClientDataStore,
  shipId: string,
  techStr: string
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

      default:
        // 检查是否为"系统内伤害提升"类（无EFFECT_ID，靠DESC识别）
        if (isWeaponDamageEffect(lookup.effect)) {
          const label = String(lookup.effect.TARGET_MODULE_TYPE ?? 'main');
          weaponDamageBonus[label] = (weaponDamageBonus[label] ?? 0) + lookup.value * 100;
          effects.push(resolved);
          break;
        }
        // 未实现的 EFFECT
        unresolved.push({
          tech,
          effectId,
          name: resolved.name,
          reason: `EFFECT_ID=${effectId} 暂未实现转译`,
        });
        break;
    }
  }

  // 结构值 = base×(1+Σ万分比/10000)。巅峰/版本号绝对值加成由调用方额外传入或后续里程碑处理
  const finalStructure = Math.round(baseStructure * (1 + structureBonusPermille / PERMILLE));

  return {
    shipId,
    baseStructure,
    finalStructure,
    structureBonusPermille,
    resistanceBonus,
    hitBonusByTargetClass,
    hitBonus,
    dodgeBonus,
    weaponDamageBonus,
    weaponCooldownReduction,
    speedBonus,
    curvatureSpeedBonus,
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
