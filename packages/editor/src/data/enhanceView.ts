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

  // ★提取二选一桶：同 (slotId, treeColumn) 内 nodeFlag≠0 节点 ≥2 个
  //   注意：treeColumn 实际是【行号 ui_level】(frida 实证)，二选一对同 ui_level
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
        options: opts.sort((a, b) => a.nodeFlag - b.nodeFlag), // flag1 在前（主显示位）
        selectedEnhanceId: selected?.enhanceId,
      };
    }
  }

  // ★计算列号 = 从根节点 BFS 的跳数（frida 实证 tree_index）
  //   根(parent=0)的子=列0, 再下一跳=列1... 不是 treeColumn!
  const bfsCol = new Map<string, number>();
  const roots = allSlots.filter((s) => s.prerequisites.length === 0);
  const queue: Array<{ slot: EnhanceSlot; col: number }> = [];
  // 根节点本身没有"列"（它们是各链起点）；根的子节点=列0
  // 但 frida dump 显示根的子节点在列0，所以：根→列0
  for (const r of roots) {
    bfsCol.set(r.enhanceId, 0);
    queue.push({ slot: r, col: 0 });
  }
  while (queue.length > 0) {
    const { slot, col } = queue.shift()!;
    // 找所有以 slot 为前置之一的节点
    for (const s of allSlots) {
      if (bfsCol.has(s.enhanceId)) continue;
      if (s.prerequisites.includes(slot.enhanceId)) {
        const newCol = col + 1;
        bfsCol.set(s.enhanceId, newCol);
        queue.push({ slot: s, col: newCol });
      }
    }
  }

  const acquiredSet = new Set(acquired.keys());

  // 决定哪些节点在 UI 上显示（二选一：未选时只显示 flag 最小的主选项，合并为一个图标位）
  const hiddenByChoice = new Set<string>();
  for (const grp of Object.values(choiceGroups)) {
    if (!grp.selectedEnhanceId) {
      // 未选：隐藏除主选项(flag最小)外的所有选项
      const mainOpt = grp.options[0]; // 已按 nodeFlag 升序，flag1 在前
      for (const opt of grp.options) {
        if (opt.enhanceId !== mainOpt.enhanceId) hiddenByChoice.add(opt.enhanceId);
      }
    } else {
      // 已选：隐藏未选中的选项
      for (const opt of grp.options) {
        if (opt.enhanceId !== grp.selectedEnhanceId) hiddenByChoice.add(opt.enhanceId);
      }
    }
  }

  // 按 BFS 列号分组，列内按 treeColumn(=ui_level 行号)升序排（行号小的在上）
  const colBuckets: Record<number, EnhanceSlot[]> = {};
  for (const s of allSlots) {
    if (hiddenByChoice.has(s.enhanceId)) continue;
    const col = bfsCol.get(s.enhanceId) ?? 0;
    (colBuckets[col] = colBuckets[col] || []).push(s);
  }

  const columns: Record<number, EnhanceNodeVM[]> = {};
  for (const [colStr, slots] of Object.entries(colBuckets)) {
    const col = Number(colStr);
    // 列内按 treeColumn(ui_level 行号)升序，同 ui_level 按 optIdx
    slots.sort((a, b) => a.treeColumn - b.treeColumn || a.optIdx - b.optIdx);

    columns[col] = slots.map((s) => {
      const choiceKey = `${s.slotId}_${s.treeColumn}`;
      const grp = choiceGroups[choiceKey];
      const isChoice = !!grp && s.nodeFlag !== 0 && grp.options[0].enhanceId === s.enhanceId;
      const level = acquired.get(s.enhanceId) ?? 0;

      let state: NodeState;
      if (isChoice && grp) {
        // 二选一主显示位
        if (grp.selectedEnhanceId) {
          state = grp.selectedEnhanceId === s.enhanceId
            ? (level > 0 ? "acquired" : "available")
            : "locked";
        } else {
          state = "choice";
        }
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
