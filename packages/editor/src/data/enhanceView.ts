/**
 * 强化页数据选择器
 *
 * 封装引擎 enhanceSystem/tuneSystem 的解析结果为 UI 友好结构：
 * - 树按列布局 + 节点状态机
 * - 二选一桶提取（同 slotId+treeColumn 的 nodeFlag≠0 节点）
 * - 描述渲染（方案B：简单类数值替换/复杂类DESC_DETAIL）
 * - 消耗计算（单级 + 加满总额）
 * - 等级显示文本（"2+1/4" 格式）
 */
import type { ClientDataStore } from "@lagrange/engine";
import {
  resolveEnhanceSystem,
  resolveEnhanceTree,
  resolveTuneSystem,
  getEnhanceValue,
  isEnhanceAvailable,
  type EnhanceSlot,
  type EnhanceSystemSlotInfo,
} from "@lagrange/engine";
import type { TuneSlot } from "@lagrange/engine";

/** 节点 UI 状态 */
export type NodeState =
  | "locked"      // 前置未满足 或 空槽
  | "available"   // 可点但未点
  | "acquired"    // 已点（level>0）
  | "selected"    // 当前选中（浮窗打开）
  | "choice";     // 二选一未选（合并图标）

/** UI 用节点（含状态） */
export interface EnhanceNodeVM {
  slot: EnhanceSlot;
  state: NodeState;
  currentLevel: number;
  isChoice: boolean;        // 是否二选一节点（nodeFlag≠0 且在 ≥2 桶里）
  choiceGroupId?: string;   // 二选一桶 key（slotId+treeColumn）
}

/** 二选一桶 */
export interface ChoiceGroup {
  key: string;              // `${slotId}_${treeColumn}`
  slotId: string;
  treeColumn: number;
  options: EnhanceSlot[];   // 互斥选项（通常 2 个）
  selectedEnhanceId?: string; // 已选项（acquired 中的）
}

/** 系统导航项 */
export interface SystemNavItem {
  slotId: string;
  name: string;       // 系统名
  isActive: boolean;  // 是否启用（切换组语义）
  isCurrent: boolean; // 是否当前选中
  prefix: number;     // SYSTEM_EFFECT_PREFIX（取图标用，0=无图标），来自该槽首个强化项
}

/** 加点浮窗数据 */
export interface EnhanceSheetVM {
  mode: "multi" | "single" | "choice";
  slot: EnhanceSlot;
  slotInfo: EnhanceSystemSlotInfo;
  currentLevel: number;
  maxLevel: number;
  name: string;
  icon: string;
  descHtml: string;        // 描述（数值替换或 DESC_DETAIL）
  levelDots: boolean[];    // 圆点 [true,true,false,false]
  singleCost: number;      // +1 级消耗（右按钮）
  fullCost: number;        // 加满总额（左按钮）
  prereqMissing: string[]; // 前置未满足的原因
  isMaxed: boolean;        // 已满级
  choiceGroup?: ChoiceGroup; // choice 模式专用
}

/**
 * 解析某系统槽的科技树为 UI 节点（含状态 + 二选一合并）。
 */
export function resolveEnhanceTreeVM(
  store: ClientDataStore,
  shipId: string,
  slotId: string,
  acquired: Map<string, number>,
  selectedEnhanceId?: string
): { columns: Record<number, EnhanceNodeVM[]>; choiceGroups: Record<string, ChoiceGroup> } {
  const sys = resolveEnhanceSystem(store, shipId);
  const slotInfo = sys.slotInfos[slotId];
  const { columns: rawColumns } = resolveEnhanceTree(store, shipId, slotId);

  // 收集该槽所有节点（扁平），用于算拓扑深度
  const allSlots: EnhanceSlot[] = [];
  for (const slots of Object.values(rawColumns)) allSlots.push(...slots);
  const slotById = new Map(allSlots.map((s) => [s.enhanceId, s]));

  // ★计算拓扑深度（根=0，其他=max(前置深度)+1）作为视觉列号
  //   原始 treeColumn 是数据分组ID，不是视觉位置；用拓扑深度保证"从左到右解锁"
  const depthCache = new Map<string, number>();
  const computeDepth = (slot: EnhanceSlot, seen: Set<string>): number => {
    if (depthCache.has(slot.enhanceId)) return depthCache.get(slot.enhanceId)!;
    if (seen.has(slot.enhanceId)) return 0; // 防环
    if (slot.prerequisites.length === 0) {
      depthCache.set(slot.enhanceId, 0);
      return 0;
    }
    const nextSeen = new Set(seen);
    nextSeen.add(slot.enhanceId);
    let maxParent = -1;
    for (const pId of slot.prerequisites) {
      const p = slotById.get(pId);
      if (p) maxParent = Math.max(maxParent, computeDepth(p, nextSeen));
    }
    const d = maxParent + 1;
    depthCache.set(slot.enhanceId, d);
    return d;
  };
  for (const s of allSlots) computeDepth(s, new Set());

  // 提取二选一桶：同 (slotId, nodeFlag组) 的 nodeFlag≠0 节点 ≥2 个
  //   注意：用拓扑深度分组而非原始 treeColumn（10/13 二选一都在深度0）
  const choiceBuckets: Record<string, EnhanceSlot[]> = {};
  for (const s of allSlots) {
    if (s.nodeFlag !== 0) {
      const d = depthCache.get(s.enhanceId)!;
      const key = `${s.slotId}_d${d}`; // 按深度分组
      (choiceBuckets[key] = choiceBuckets[key] || []).push(s);
    }
  }
  const choiceGroups: Record<string, ChoiceGroup> = {};
  for (const [key, opts] of Object.entries(choiceBuckets)) {
    if (opts.length >= 2) {
      const selected = opts.find((o) => (acquired.get(o.enhanceId) ?? 0) > 0);
      choiceGroups[key] = {
        key,
        slotId: opts[0].slotId,
        treeColumn: depthCache.get(opts[0].enhanceId)!,
        options: opts,
        selectedEnhanceId: selected?.enhanceId,
      };
    }
  }

  // 按拓扑深度分列构建 UI 节点
  const acquiredSet = new Set(acquired.keys());
  const columns: Record<number, EnhanceNodeVM[]> = {};
  for (const s of allSlots) {
    const d = depthCache.get(s.enhanceId)!;
    const choiceKey = `${s.slotId}_d${d}`;
    const isChoice = !!choiceGroups[choiceKey] && s.nodeFlag !== 0;
    const level = acquired.get(s.enhanceId) ?? 0;

    let state: NodeState;
    const grp = isChoice ? choiceGroups[choiceKey] : undefined;
    if (isChoice && !grp!.selectedEnhanceId) {
      state = "choice";
    } else if (isChoice && grp!.selectedEnhanceId && grp!.selectedEnhanceId !== s.enhanceId) {
      state = "locked";
    } else if (level > 0) {
      state = "acquired";
    } else if (slotInfo) {
      const avail = isEnhanceAvailable(s, slotInfo, acquiredSet);
      state = avail.available ? "available" : "locked";
    } else {
      state = "locked";
    }
    if (s.enhanceId === selectedEnhanceId) state = "selected";

    (columns[d] = columns[d] || []).push({
      slot: s,
      state,
      currentLevel: level,
      isChoice,
      choiceGroupId: isChoice ? choiceKey : undefined,
    });
  }
  // 各列内按 optIdx 升序
  for (const col in columns) {
    columns[col].sort((a, b) => a.slot.optIdx - b.slot.optIdx);
  }
  return { columns, choiceGroups };
}

/**
 * 取全舰系统导航条 + 默认槽（slotId 最小的有强化项的槽）。
 */
export function resolveSystemNav(
  store: ClientDataStore,
  shipId: string,
  currentSlotId: string
): { items: SystemNavItem[]; defaultSlotId: string } {
  const sys = resolveEnhanceSystem(store, shipId);
  const slotIds = Object.keys(sys.bySlot).sort();
  const defaultSlotId = slotIds[0] ?? "";
  const items: SystemNavItem[] = slotIds.map((sid) => {
    const info = sys.slotInfos[sid];
    // 取该槽首个强化项的 SYSTEM_EFFECT_PREFIX（用于 prefixIcon 解析系统图标）
    const slots = sys.bySlot[sid];
    const firstPrefix = slots && slots.length > 0 ? Number(slots[0].effectPrefix) : 0;
    return {
      slotId: sid,
      name: info?.systemName || sid,
      isActive: info?.isActive ?? true,
      isCurrent: sid === currentSlotId,
      prefix: firstPrefix,
    };
  });
  return { items, defaultSlotId };
}

/** 取某槽的调校项 */
export function resolveTuneRow(
  store: ClientDataStore,
  shipId: string,
  slotId: string
): TuneSlot[] {
  const tune = resolveTuneSystem(store, shipId);
  return tune.tuneSlots.filter((t) => t.slotId === slotId);
}

/**
 * 渲染强化项描述（方案 B）。
 * - 简单类（能取到非零数值）：显示 "当前 → 下一级" 或单值
 * - 复杂类（无等级表/数值为0）：用 DESC_DETAIL 纯文字解说（slot.effect.desc 已是无占位符版本）
 *
 * 返回带 <b> 高亮的 HTML 片段（数值用金色）。
 */
export function renderEnhanceDesc(
  store: ClientDataStore,
  slot: EnhanceSlot,
  currentLevel: number
): string {
  if (slot.maxLevel > 0) {
    const isMaxed = currentLevel >= slot.maxLevel;
    const curVal = currentLevel > 0 ? getEnhanceValue(store, slot.enhanceId, currentLevel) : 0;
    const nextVal = !isMaxed ? getEnhanceValue(store, slot.enhanceId, currentLevel + 1) : 0;

    // 数值有意义（非 0）才走数值替换分支
    if (curVal > 0 || nextVal > 0) {
      const detail = slot.effect?.desc || slot.effect?.name || "";
      const valStr = isMaxed
        ? `<b style="color:#ffc857">${Math.round(curVal)}</b>`
        : currentLevel === 0
        ? `<b style="color:#ffc857">${Math.round(nextVal)}</b>`
        : `<b style="color:#ffc857">${Math.round(curVal)} → ${Math.round(nextVal)}</b>`;
      return `${detail} ${valStr}`;
    }
  }
  // 复杂类：用 DESC_DETAIL（引擎 effect.desc 已是纯文字）
  return slot.effect?.desc || slot.effect?.name || "";
}

/**
 * 等级显示文本分段："2+1/4" 格式。
 * - 未强化（0级）：current="" next="+1" max="/4"（组件渲染为 +1/4）
 * - 部分（2级,max4）：current="2" next="+1" max="/4"
 * - 满级：current="4" next="" max="/4"（无 +1）
 */
export function levelText(currentLevel: number, maxLevel: number): {
  current: string;
  next: string;
  max: string;
} {
  const isMaxed = currentLevel >= maxLevel;
  return {
    current: currentLevel > 0 ? String(currentLevel) : "",
    next: isMaxed ? "" : "+1",
    max: `/${maxLevel}`,
  };
}

/** 单级消耗（+1 级），从原始 enhance 记录取 ENHANCE_COST */
export function singleCost(store: ClientDataStore, slot: EnhanceSlot, currentLevel: number): number {
  const rec = (store.systemEnhance as Record<string, { ENHANCE_COST?: number[] }>)[slot.enhanceId];
  const costs = rec?.ENHANCE_COST ?? [];
  return costs[currentLevel] ?? 0;
}

/** 加满总额（从 currentLevel 加到 maxLevel） */
export function fullCost(store: ClientDataStore, slot: EnhanceSlot, currentLevel: number): number {
  const rec = (store.systemEnhance as Record<string, { ENHANCE_COST?: number[] }>)[slot.enhanceId];
  const costs = rec?.ENHANCE_COST ?? [];
  let sum = 0;
  for (let i = currentLevel; i < costs.length; i++) sum += costs[i];
  return sum;
}
