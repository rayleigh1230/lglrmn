/**
 * 蓝图设计状态管理
 * 维护: 选中蓝图 + 科技串(enhance等级映射) + 外部参数(巅峰/版本)
 * 派生: resolveBlueprint 结果 + countTechPoints 结果
 */
import { useState, useMemo, useCallback, useEffect } from "react";
import type { ClientDataStore } from "@lagrange/engine";
import { resolveBlueprint, countTechPoints } from "@lagrange/engine";
import {
  levelsToTechStr,
  type EnhanceLevelState,
} from "../data/codec";

export type { EnhanceLevelState } from "../data/codec";

export interface BlueprintOptions {
  /** 巅峰等级（0-20），resolver 自动从 cfg_ship_peak_level 聚合结构/移速加成 */
  peakLevel: number;
  versionStructureBonus: number;
}

export function useBlueprintDesign(store: ClientDataStore | null, bpId: string, shipId: string) {
  const [levels, setLevels] = useState<EnhanceLevelState>({});
  const [options, setOptions] = useState<BlueprintOptions>({
    peakLevel: 0,
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
        peakLevel: options.peakLevel || undefined,
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
