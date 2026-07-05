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

/** UI 用节点（含状态 + 网格坐标） */
export interface EnhanceNodeVM {
  slot: EnhanceSlot;
  state: NodeState;
  currentLevel: number;
  isChoice: boolean;        // 是否二选一节点（nodeFlag≠0 且在 ≥2 桶里）
  choiceGroupId?: string;   // 二选一桶 key（slotId+treeColumn）
  gridCol: number;          // ★网格列号（= BFS 跳数）
  gridRow: number;          // ★网格行号（= ui_level 按高度降序后的序号，0=最上）
  hasPeakExtra: boolean;    // ★巅峰等级提升了该槽 maxLevel（显示 ADV 标志）
  extraMaxLevel: number;    // ★巅峰提升的额外等级数
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
 * 解析某系统槽的科技树为 UI 节点（含状态 + 二选一合并 + 巅峰扩展）。
 */
export function resolveEnhanceTreeVM(
  store: ClientDataStore,
  shipId: string,
  slotId: string,
  acquired: Map<string, number>,
  selectedEnhanceId?: string,
  peakLevel = 0
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

  // ★计算行号：ui_level(treeColumn) 按 LEVEL_ENHANCE_HIGHT 高度降序后的序号（0=最上）
  //   LEVEL_ENHANCE_HIGHT = {3:0, 0:1, 2:2, 4:4}（cocos Y向上，值越大越靠屏幕上方）
  //   行序：ui4(高4)→ui2(高2)→ui0(高1)→ui3(高0)，即 [4,2,0,3]
  const HEIGHT: Record<number, number> = { 3: 0, 0: 1, 2: 2, 4: 4 };
  const visibleSlots = allSlots.filter((s) => !hiddenByChoice.has(s.enhanceId));
  const uiLevels = Array.from(new Set(visibleSlots.map((s) => s.treeColumn)));
  uiLevels.sort((a, b) => (HEIGHT[b] ?? b) - (HEIGHT[a] ?? a)); // 高度降序
  const rowOfUi: Record<number, number> = {};
  uiLevels.forEach((u, i) => { rowOfUi[u] = i; });

  // ★巅峰等级提升的额外 maxLevel（optIdx70 的 ENHANCE_COST 长度，按巅峰等级截取）
  //   peak_enhance_map.json: { slotId: [peakEnhanceId(optIdx70)] }
  //   extra = min(peakLevel, optIdx70 的 ENHANCE_COST 长度)
  const peakMap = (store as any).peakEnhanceMap as Record<string, string[]> | undefined;
  const peakEnhanceId = peakMap?.[slotId]?.[0];
  let extraMaxLevel = 0;
  if (peakEnhanceId && peakLevel > 0) {
    const peakRec = (store.systemEnhance as Record<string, { ENHANCE_COST?: number[] }>)[peakEnhanceId];
    const peakCostLen = peakRec?.ENHANCE_COST?.length ?? 0;
    extraMaxLevel = Math.min(peakLevel, peakCostLen);
  }

  // 构建 VM（含网格坐标 gridCol=BFS跳数, gridRow=行号）
  const columns: Record<number, EnhanceNodeVM[]> = {};
  for (const s of visibleSlots) {
    const col = bfsCol.get(s.enhanceId) ?? 0;
    const choiceKey = `${s.slotId}_${s.treeColumn}`;
    const grp = choiceGroups[choiceKey];
    const isChoice = !!grp && s.nodeFlag !== 0 && grp.options[0].enhanceId === s.enhanceId;
    const level = acquired.get(s.enhanceId) ?? 0;

    let state: NodeState;
    if (isChoice && grp) {
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

    const vm: EnhanceNodeVM = {
      slot: s,
      state,
      currentLevel: level,
      isChoice,
      choiceGroupId: isChoice ? choiceKey : undefined,
      gridCol: col,
      gridRow: rowOfUi[s.treeColumn] ?? 0,
      hasPeakExtra: extraMaxLevel > 0,
      extraMaxLevel,
    };
    (columns[col] = columns[col] || []).push(vm);
  }
  // 各列内按行号升序（行号小=最上，排前面）
  for (const col in columns) {
    columns[col].sort((a, b) => a.gridRow - b.gridRow || a.slot.optIdx - b.slot.optIdx);
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
 * 渲染强化项描述（用 frida 批量 dump 的渲染表，占位符已替换）。
 *
 * 数据来源：store.enhanceDescRendered（enhance_desc_rendered.json），
 *   格式 { enhanceId: { level: "占位符已替换的纯文本" } }。
 *
 * 显示规则（与等级区 2+1/4 的 +1 语义一致——预览下一级的增加量）：
 *   - 未强化：显示1级描述（下一级预览）
 *   - 部分强化：当前级描述 + 增量标注（+Δ，金色）
 *   - 满级：只显示满级描述
 *
 * 增量 = 下一级数值 − 当前级数值（从两段文本提取数字相减）。
 *
 * 返回带 <b> 高亮的 HTML 片段。表缺失时回退到 DESC_DETAIL。
 */
export function renderEnhanceDesc(
  store: ClientDataStore,
  slot: EnhanceSlot,
  currentLevel: number,
  preview = false
): string {
  const descTable = (store as any).enhanceDescRendered as
    | Record<string, Record<string, string>>
    | undefined;
  const byLv = descTable?.[slot.enhanceId];

  // 颜色：当前值白(对应等级区 es-lv-cur)，下一级增量金(对应 es-lv-next)
  const CUR_COLOR = "#e0e6f0";
  const NEXT_COLOR = "#ffc857";
  const NUM_RE = /\d+(?:\.\d+)?%?/g;
  // 从文本提取所有数字(含百分比), 返回数值数组(去%)
  const extractNums = (s: string): number[] =>
    (s.match(NUM_RE) ?? []).map((x) => Number(x.replace("%", "")));

  if (byLv && slot.maxLevel > 0) {
    const isMaxed = currentLevel >= slot.maxLevel;
    const curDesc = currentLevel > 0 ? (byLv[String(currentLevel)] ?? "") : "";
    const nextDesc = !isMaxed ? (byLv[String(currentLevel + 1)] ?? "") : "";

    if (isMaxed) {
      // 满级：只有当前值，无增量（对应等级区 4/4 无 +1）
      return curDesc.replace(NUM_RE, `<b style="color:${CUR_COLOR}">$&</b>`);
    }

    // 默认模式 + 预览模式 共用"当前值(+差值)"规则
    //   差值来源: 默认=下一级(currentLevel+1), 预览=满级(maxLevel)
    //   单级强化(maxLevel=1)不加 + 前缀
    const targetLevel = preview ? slot.maxLevel : currentLevel + 1;
    const targetDesc = byLv[String(targetLevel)] ?? nextDesc;
    const isSingleLevel = slot.maxLevel === 1;

    const curNums = currentLevel > 0 ? extractNums(curDesc) : [];
    const targetNums = extractNums(targetDesc);
    // 模板: 部分强化用 curDesc(显示当前值), 未强化用 targetDesc(不显示当前值只显示差值)
    const template = currentLevel > 0 ? curDesc : targetDesc;
    // 差值数组: targetNums[i] - curNums[i] (未强化 curNums 当0)
    const incArr: string[] = [];
    for (let i = 0; i < targetNums.length; i++) {
      const cv = currentLevel > 0 ? (curNums[i] ?? 0) : 0;
      const d = targetNums[i] - cv;
      if (d > 0) {
        const raw = (targetDesc.match(NUM_RE) ?? [])[i] ?? "";
        const unit = raw.includes("%") ? "%" : "";
        incArr.push(isSingleLevel ? `${d}${unit}` : `+${d}${unit}`);
      } else {
        incArr.push("");
      }
    }
    // 遍历 template, 第 i 个数字 → 当前值(白)(+差值)(金) / 只差值(金,未强化)
    let i = 0;
    const result = template.replace(NUM_RE, (match) => {
      const inc = incArr[i] ?? "";
      i++;
      if (currentLevel > 0) {
        const curPart = `<b style="color:${CUR_COLOR}">${match}</b>`;
        const incPart = inc ? ` <b style="color:${NEXT_COLOR}">${inc}</b>` : "";
        return `${curPart}${incPart}`;
      }
      // 未强化：不显示当前数值，只显示差值(金)；无变化留空
      return inc ? `<b style="color:${NEXT_COLOR}">${inc}</b>` : "";
    });
    return result;
  }

  // 回退：DESC_DETAIL 纯文字（无占位符）
  return slot.effect?.desc || slot.effect?.name || "";
}

/**
 * 等级显示文本分段："2+1/4" 格式。
 * - 默认模式：next = "+1"（下一级）
 * - preview 模式（全部加强预览）：next = "+(maxLevel-currentLevel)"（加满还差几级），满级为""不显示
 *
 * - 未强化（0级）：current="" next="+N" max="/4"
 * - 部分（2级,max4）：current="2" next="+1"(默认)/"+2"(预览,4-2) max="/4"
 * - 满级：current="4" next=""（差值0不显示）max="/4"
 */
export function levelText(currentLevel: number, maxLevel: number, preview = false): {
  current: string;
  next: string;
  max: string;
} {
  const isMaxed = currentLevel >= maxLevel;
  let next: string;
  if (isMaxed) {
    next = "";
  } else if (preview) {
    // 全部加强预览：+N = 加满还差几级（maxLevel - currentLevel）
    const remain = maxLevel - currentLevel;
    next = remain > 0 ? `+${remain}` : "";
  } else {
    next = "+1";
  }
  return {
    current: currentLevel > 0 ? String(currentLevel) : "",
    next,
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
