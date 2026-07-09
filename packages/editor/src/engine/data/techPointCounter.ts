/**
 * 技能点（技术值）统计器
 *
 * 统计一个蓝图科技串消耗的总技能点。
 * 每个强化项每级的消耗不同，来自 cfg_system_enhance.ENHANCE_COST 数组。
 *
 * ENHANCE_COST 格式：[lv1消耗, lv2消耗, ...]，累计到 N 级 = sum(cost[0..N-1])
 * 不同强化项的消耗不同（如优势输出 COST=[15] 一级就15点，普通强化每级1-2点）
 */

import type { ClientDataStore } from './rawTypes';
import { parseTechString, type TechModule } from './techString';

/** 单个强化项的技能点消耗明细 */
export interface TechPointCost {
  tech: TechModule;
  /** 该强化项的 ENHANCE_COST 数组 */
  costPerLevel: number[];
  /** 累计到当前 level 的消耗 */
  totalCost: number;
  /** 该强化项的名称 */
  name: string;
}

/** 技能点统计结果 */
export interface TechPointSummary {
  /** 总技能点消耗 */
  totalPoints: number;
  /** 每个强化项的消耗明细 */
  items: TechPointCost[];
  /** 未找到 ENHANCE_COST 的强化项（无法统计） */
  unresolved: TechModule[];
}

/**
 * 用 enhanceId 直接查找 ENHANCE_COST。
 * enhanceId = slotId(7位) + optIdx(2位)，由 parseTechString 计算得出。
 */
function findEnhanceCostById(
  store: ClientDataStore,
  tech: TechModule
): { cost: number[]; name: string } | null {
  const enhance = store.systemEnhance[tech.enhanceId];
  if (!enhance) return null;
  const eff = store.systemEffect[String(tech.techId) + '01'];
  return {
    cost: enhance.ENHANCE_COST ?? [],
    name: eff?.NAME ?? '(无名)',
  };
}

/**
 * 统计科技串消耗的总技能点。
 *
 * @param store 配置表存储
 * @param techStr 战报科技串
 * @returns 技能点统计结果（含每个强化项的消耗明细）
 */
export function countTechPoints(
  store: ClientDataStore,
  techStr: string
): TechPointSummary {
  const modules = parseTechString(techStr);
  const items: TechPointCost[] = [];
  const unresolved: TechModule[] = [];
  let totalPoints = 0;

  for (const tech of modules) {
    const found = findEnhanceCostById(store, tech);
    if (!found || found.cost.length === 0) {
      unresolved.push(tech);
      continue;
    }
    const costToLevel = found.cost
      .slice(0, tech.level)
      .reduce((a, b) => a + b, 0);
    totalPoints += costToLevel;
    items.push({
      tech,
      costPerLevel: found.cost,
      totalCost: costToLevel,
      name: found.name,
    });
  }

  return { totalPoints, items, unresolved };
}
