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

  // 收集该槽所有节点（扁平）
  const allSlots: EnhanceSlot[] = [];
  for (const slots of Object.values(rawColumns)) allSlots.push(...slots);
  const slotById = new Map(allSlots.map((s) => [s.enhanceId, s]));

  // 提取二选一桶：同 (slotId, treeColumn) 内 nodeFlag≠0 节点 ≥2 个
  //   treeColumn 是游戏原始列号(视觉X坐标)，二选一对在同一列并排
  const choiceBuckets: Record<string, EnhanceSlot[]> = {};
  for (const s of allSlots) {
    if (s.nodeFlag !== 0) {
      const key = `${s.slotId}_${s.treeColumn}`;
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
        treeColumn: opts[0].treeColumn,
        options: opts,
        selectedEnhanceId: selected?.enhanceId,
      };
    }
  }

  // 按原始 treeColumn 分列（游戏视觉X坐标）
  const acquiredSet = new Set(acquired.keys());
  const colBuckets: Record<number, EnhanceSlot[]> = {};
  for (const s of allSlots) {
    (colBuckets[s.treeColumn] = colBuckets[s.treeColumn] || []).push(s);
  }

  // 列内排序：按"同列内的依赖链顺序"（同列前置在上，形成竖向链）
  //   根/无同列前置的排最上；二选一对(flag≠0)排在其依赖链起点附近
  const columns: Record<number, EnhanceNodeVM[]> = {};
  for (const [colStr, slots] of Object.entries(colBuckets)) {
    const col = Number(colStr);
    const byId = new Map(slots.map((s) => [s.enhanceId, s]));
    const ordered: EnhanceSlot[] = [];
    const placed = new Set<string>();
    const place = (s: EnhanceSlot) => {
      if (placed.has(s.enhanceId)) return;
      // 先递归放置同列内的前置（同列链：父在上）
      for (const pId of s.prerequisites) {
        const p = byId.get(pId);
        if (p && !placed.has(pId)) place(p);
      }
      placed.add(s.enhanceId);
      ordered.push(s);
    };
    for (const s of slots) place(s);

    columns[col] = ordered.map((s) => {
      const choiceKey = `${s.slotId}_${s.treeColumn}`;
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

      return {
        slot: s,
        state,
        currentLevel: level,
        isChoice,
        choiceGroupId: isChoice ? choiceKey : undefined,
      };
    });
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
