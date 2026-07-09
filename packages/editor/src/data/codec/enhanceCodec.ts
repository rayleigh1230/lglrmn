/**
 * 强化系统 codec
 *
 * 模拟器内部用结构化对象（enhanceLevels: Record<string, number>），
 * 跨边界（导入真实存档 / 导出给客户端用）走客户端字符串格式：
 *
 *   客户端 ShipField.EFFECTS_ENHANCED = "slotId,optIdx,techId,level;..."
 *
 * 注：实现从 useBlueprintDesign.ts 迁移而来，逻辑保持不变。
 */
import type { ClientDataStore } from "../../engine";
import { parseTechString } from "../../engine";

/** 强化等级映射（enhanceId9位 → level） */
export interface EnhanceLevelState {
  [enhanceId: string]: number;
}

/**
 * 把 enhance 等级状态 → 客户端科技字符串
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

/** 从客户端科技字符串 → enhance 等级状态 */
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
