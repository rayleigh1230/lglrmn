/**
 * 蓝图设计状态管理
 * 维护: 选中蓝图 + 科技串(enhance等级映射) + 外部参数(巅峰/版本)
 * 派生: resolveBlueprint 结果 + countTechPoints 结果
 */
import { useState, useMemo, useCallback, useEffect } from "react";
import type { ClientDataStore } from "@lagrange/engine";
import { resolveBlueprint, countTechPoints, parseTechString } from "@lagrange/engine";

export interface EnhanceLevelState {
  // enhance_id (9位) → level
  [enhanceId: string]: number;
}

export interface BlueprintOptions {
  peakStructureBonus: number;
  versionStructureBonus: number;
}

/**
 * 把 enhance 等级状态 → 科技字符串
 * 格式: slotId,optIdx,techId,level, ... (按 slotId 分组)
 */
export function levelsToTechStr(
  store: ClientDataStore,
  shipId: string,
  levels: EnhanceLevelState
): string {
  if (!store.systemEnhance) return "";
  // 收集所有有等级的 enhance_id, 按其 slotId 分组
  const bySlot: Record<string, { optIdx: number; techId: number; level: number }[]> = {};
  for (const enhanceId in levels) {
    const lvl = levels[enhanceId];
    if (!lvl || lvl < 1) continue;
    const rec = store.systemEnhance[enhanceId];
    if (!rec) continue;
    // enhance_id 9位 = slotId(7) + optIdx(2)
    const slotId = enhanceId.slice(0, 7);
    const optIdx = parseInt(enhanceId.slice(7, 9), 10);
    const techId = (rec as any).SYSTEM_EFFECT_PREFIX;
    if (!bySlot[slotId]) bySlot[slotId] = [];
    bySlot[slotId].push({ optIdx, techId, level: lvl });
  }
  // 拼接: slotId,optIdx,techId,level,...
  const parts: string[] = [];
  for (const slotId in bySlot) {
    const triples = bySlot[slotId].map((t) => `${t.optIdx},${t.techId},${t.level}`).join(",");
    parts.push(`${slotId},${triples}`);
  }
  return parts.join(";");
}

/** 从科技字符串 → enhance 等级状态 */
export function techStrToLevels(techStr: string): EnhanceLevelState {
  const result: EnhanceLevelState = {};
  if (!techStr) return result;
  const modules = parseTechString(techStr);
  for (const m of modules) {
    if (m.level > 0) {
      result[m.enhanceId] = m.level;
    }
  }
  return result;
}

export function useBlueprintDesign(store: ClientDataStore | null, bpId: string, shipId: string) {
  const [levels, setLevels] = useState<EnhanceLevelState>({});
  const [options, setOptions] = useState<BlueprintOptions>({
    peakStructureBonus: 0,
    versionStructureBonus: 0,
  });

  // 当前科技串
  const techStr = useMemo(() => {
    if (!store || !shipId) return "";
    return levelsToTechStr(store, shipId, levels);
  }, [store, shipId, levels]);

  // resolveBlueprint 结果
  const blueprint = useMemo(() => {
    if (!store || !shipId) return null;
    try {
      return resolveBlueprint(store, shipId, techStr, {
        peakStructureBonus: options.peakStructureBonus || undefined,
        versionStructureBonus: options.versionStructureBonus || undefined,
      });
    } catch (e) {
      console.error("[resolveBlueprint] error:", e);
      return null;
    }
  }, [store, shipId, techStr, options]);

  // 技能点统计
  const techPoints = useMemo(() => {
    if (!store) return null;
    try {
      return countTechPoints(store, techStr);
    } catch (e) {
      console.error("[countTechPoints] error:", e);
      return null;
    }
  }, [store, techStr]);

  const setLevel = useCallback((enhanceId: string, level: number) => {
    setLevels((prev) => {
      const next = { ...prev };
      if (level <= 0) {
        delete next[enhanceId];
      } else {
        next[enhanceId] = level;
      }
      return next;
    });
  }, []);

  const resetLevels = useCallback(() => setLevels({}), []);

  return {
    levels,
    techStr,
    blueprint,
    techPoints,
    options,
    setLevel,
    setOptions,
    resetLevels,
  };
}
