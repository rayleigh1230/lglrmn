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
import type { ClientDataStore } from "../engine";
import {
  resolveEnhanceSystem,
  resolveEnhanceTree,
  resolveTuneSystem,
  isEnhanceAvailable,
  type EnhanceSlot,
  type EnhanceSystemSlotInfo,
  type TuneSlot,
} from "../engine";
import { prefixIcon } from "./iconResolver";
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

/** 孔位状态 */
export type SlotState = "full" | "partial" | "empty";

/**
 * ★计算某系统槽的孔位状态数组（强化页导航条 + 蓝图页系统排 共用，确保两边联动一致）。
 *
 * 语义：总数 = ENHANCEMENTS_LIMIT；按计数着色：
 *   - full（白）= 满级强化项数（acquired level >= maxLevel）
 *   - partial（灰）= 已投入未满级强化项数（0 < level < maxLevel）
 *   - empty（空圈）= 剩余孔位
 *
 * ENHANCEMENTS_LIMIT 与实际强化项数无固定映射（limit=5 可能对应 6-7 个强化项），
 * 因此按「满级数 + 已投入数」计数，不与具体强化项一一绑定。
 *
 * @param store 配置数据
 * @param slotId 7位系统槽 ID
 * @param enhanceLimit 该槽的 ENHANCEMENTS_LIMIT（蓝图页 selector 已取，避免重复读表）
 * @param acquired 已投入强化等级映射（enhanceStore 内容）
 */
export function computeSlotStates(
  store: ClientDataStore,
  slotId: string,
  enhanceLimit: number,
  acquired?: Map<string, number> | Record<string, number>
): SlotState[] {
  if (enhanceLimit <= 0) return [];
  const sys = resolveEnhanceSystem(store, slotId.slice(0, 5));
  const slots = sys.bySlot[slotId] ?? [];
  const get = (eid: string): number =>
    acquired instanceof Map ? (acquired.get(eid) ?? 0) : (acquired?.[eid] ?? 0);

  let fullCount = 0;
  let partialCount = 0;
  for (const sl of slots) {
    const lv = get(sl.enhanceId);
    if (sl.maxLevel > 0 && lv >= sl.maxLevel) fullCount++;
    else if (lv > 0) partialCount++;
  }
  const emptyCount = Math.max(0, enhanceLimit - fullCount - partialCount);
  return [
    ...Array(fullCount).fill("full") as SlotState[],
    ...Array(partialCount).fill("partial") as SlotState[],
    ...Array(emptyCount).fill("empty") as SlotState[],
  ];
}

/** 系统导航项 */
export interface SystemNavItem {
  slotId: string;
  name: string;       // 系统名
  isActive: boolean;  // 是否启用（切换组语义）
  isCurrent: boolean; // 是否当前选中
  hasModule: boolean; // ★是否已装配模块（空槽不显示强化进度）
  prefix: number;     // SYSTEM_EFFECT_PREFIX（取图标用，0=无图标），来自该槽首个强化项
  enhanceLimit: number; // ★孔位总数（cfg_ship_system.ENHANCEMENTS_LIMIT）
  slots: SlotState[];   // ★每孔位状态：full=满级白, partial=已投入未满灰, empty=未强化空圈
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
  slotsFull: boolean;      // ★该系统孔位已满（已投入项数 >= ENHANCEMENTS_LIMIT），当前项未加点时不能再强化
  choiceGroup?: ChoiceGroup; // choice 模式专用
}

/**
 * ★计算某系统槽下各普通强化项(optIdx)被巅峰等级提升的"额外 maxLevel"。
 *
 * 机制（对齐客户端 `common.blueprint_utils.get_enhancement_peak_extra_max_level`）：
 *   - 普通强化项(optIdx 01-18) 调 get_peak_ex_enhance_id 找到它对应的巅峰 ex 项(optIdx 70/71)，
 *     关联通过 ex 项的 ADJUST_ENHANCE_INDEX 反向匹配（ex 项的 ADJ = 被扩展的普通 optIdx）。
 *   - 返回该 ex 项在 field[1] EXCLUSIVE_EFFECT 里的 level 值（= 额外 maxLevel 数）。
 *   - 例：斗牛40501 peak5，405010270 在 field[1] level=2，ADJ=1 → 普通optIdx01 额外+2 → 5/7。
 *   - ★不分 EFFECT_TYPE：ETYPE=3(ENHANCE_EX) 的 ex 项同样扩展普通项 maxLevel
 *     （客户端 get_peak_ex_enhance_id 走 SYSTEM_ENHANCE_TAKE_EX，不按 ETYPE 过滤）。
 *
 * @returns { 被扩展的普通optIdx → 额外 maxLevel 数 }
 */
export function computePeakExtraByOptIdx(
  store: ClientDataStore,
  shipId: string,
  slotId: string,
  peakLevel: number
): Record<number, number> {
  const result: Record<number, number> = {};
  if (peakLevel <= 0) return result;
  const peakTable = store.shipPeakLevel as Record<string, [string, string]> | undefined;
  const peakKey = shipId + String(peakLevel).padStart(2, "0");
  const peakEntry = peakTable?.[peakKey];
  if (!peakEntry || !peakEntry[1]) return result;
  const sysEnh = store.systemEnhance as
    | Record<string, { ADJUST_ENHANCE_INDEX?: number }>
    | undefined;
  const segs = peakEntry[1].split(";").filter((s) => s.trim());
  for (const seg of segs) {
    const [enhanceIdStr, lvStr] = seg.split(",").map((s) => s.trim());
    if (!enhanceIdStr || enhanceIdStr.slice(0, 7) !== slotId) continue;
    const peakOptIdx = parseInt(enhanceIdStr.slice(7, 9), 10);
    if (peakOptIdx < 70) continue;
    // ex 项的 ADJUST_ENHANCE_INDEX = 被扩展的普通 optIdx（ex项→普通项的反向映射）
    const peakRec = sysEnh?.[enhanceIdStr];
    const targetOptIdx = peakRec?.ADJUST_ENHANCE_INDEX;
    if (targetOptIdx) {
      result[targetOptIdx] = (result[targetOptIdx] ?? 0) + (Number(lvStr) || 0);
    }
  }
  return result;
}

/**
 * 解析某系统槽的科技树为 UI 节点（含状态 + 二选一合并 + 巅峰扩展）。
 * @param enabledSlots 蓝图页装配选择，影响切换组门控（与蓝图页一致）
 */
export function resolveEnhanceTreeVM(
  store: ClientDataStore,
  shipId: string,
  slotId: string,
  acquired: Map<string, number>,
  selectedEnhanceId?: string,
  peakLevel = 0,
  enabledSlots?: string[]
): { columns: Record<number, EnhanceNodeVM[]>; choiceGroups: Record<string, ChoiceGroup> } {
  const sys = resolveEnhanceSystem(store, shipId, enabledSlots);
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

  // ★巅峰等级扩展——复用 computePeakExtraByOptIdx
  //   通过 ex 项(optIdx70/71) 的 ADJUST_ENHANCE_INDEX 反向匹配普通 optIdx，不分 ETYPE
  const peakExtraByOptIdx = computePeakExtraByOptIdx(store, shipId, slotId, peakLevel);

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

    // ★该节点的巅峰扩展等级（按 optIdx 匹配 peakExtraByOptIdx）
    const nodeExtra = peakExtraByOptIdx[s.optIdx] ?? 0;

    const vm: EnhanceNodeVM = {
      slot: s,
      state,
      currentLevel: level,
      isChoice,
      choiceGroupId: isChoice ? choiceKey : undefined,
      gridCol: col,
      gridRow: rowOfUi[s.treeColumn] ?? 0,
      hasPeakExtra: nodeExtra > 0,
      extraMaxLevel: nodeExtra,
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
 * 取全舰系统导航条 + 默认槽。
 *
 * ★与蓝图页系统排强关联：
 *   1. 固定系统（非切换组）：恒显示。
 *   2. 超主力舰切换组（同 GROUP≥2 成员，如 M1/M2）：只显示 enabledSlots 选中的那个成员
 *      （isActive=true），未选中的成员不显示——与蓝图页装配选择完全一致。
 *   3. 已装配模块（hasModule=true）：空槽不显示。
 *
 * @param enabledSlots 蓝图页的装配选择（systemId 列表），影响切换组的 isActive 判定
 * @param acquired 当前已投入的强化等级（算孔位状态用），可选
 */
export function resolveSystemNav(
  store: ClientDataStore,
  shipId: string,
  currentSlotId: string,
  acquired?: Map<string, number>,
  enabledSlots?: string[]
): { items: SystemNavItem[]; defaultSlotId: string } {
  // ★传 enabledSlots：切换组的 isActive 按蓝图页装配选择判定（而非默认成员）
  const sys = resolveEnhanceSystem(store, shipId, enabledSlots);
  const shipSystem = store.shipSystem as Record<string, { ENHANCEMENTS_LIMIT?: number }> | undefined;
  // ★过滤：有强化项 + 已装配模块 + （切换组）当前启用
  //   超主力舰切换组未选中的成员 → isActive=false → 不显示
  const slotIds = Object.keys(sys.bySlot)
    .filter((sid) => {
      const info = sys.slotInfos[sid];
      if (!info?.hasModule) return false;       // 空槽不显示
      if (info.isSwitchable && !info.isActive) return false; // 切换组未选中的成员不显示
      return true;
    })
    .sort();
  const defaultSlotId = slotIds[0] ?? "";
  const items: SystemNavItem[] = slotIds.map((sid) => {
    const info = sys.slotInfos[sid];
    // 取该槽首个强化项的 SYSTEM_EFFECT_PREFIX（用于 prefixIcon 解析系统图标）
    const slotsInSlot = sys.bySlot[sid] ?? [];
    const firstPrefix = slotsInSlot.length > 0 ? Number(slotsInSlot[0].effectPrefix) : 0;

    // ★孔位状态（按计数，复用 computeSlotStates，与蓝图页系统排联动一致）
    const enhanceLimit = Number(shipSystem?.[sid]?.ENHANCEMENTS_LIMIT ?? 0);
    const slotStates = computeSlotStates(store, sid, enhanceLimit, acquired);

    return {
      slotId: sid,
      name: info?.systemName || sid,
      isActive: info?.isActive ?? true,
      isCurrent: sid === currentSlotId,
      hasModule: info?.hasModule ?? false,
      prefix: firstPrefix,
      enhanceLimit,
      slots: slotStates,
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

// ===== 调校区 VM（三槽：解锁型×2 + 调校型×N）=====

/** 调校区单个槽的 UI 数据 */
export interface TuneSlotVM {
  enhanceId: string;
  slotId: string;
  optIdx: number;
  type: "unlock" | "tune";   // unlock=按钮解锁型(optIdx11/12), tune=10级调校(optIdx31-43)
  name: string;
  icon: string;
  /** 解锁型: 固定效果描述; 调校型: 效果名 */
  effectName: string;
  effectId?: number;
  param?: number;
  /** 调校型: 10级成功率 */
  adjustProb?: number[];
  /** 调校型: 被调校的目标强化项 enhanceId */
  targetEnhanceId?: string;
  rarity?: number;
  /** 当前状态 */
  state: "locked" | "available" | "active";
  currentLevel: number;
  maxLevel: number;
}

/**
 * 解析调校区：解锁型槽(optIdx 11/12, UNLOCK_TYPE=2) + 调校型槽(optIdx 31-43)
 * 解锁顺序: 按列表顺序从左到右, 前一个是后一个的前置
 *
 * ★三槽都不隐藏（用户确认）：前置两个解锁槽 + 第三个调校槽永远显示。
 *   未解锁=灰图标，已解锁=高亮图标。
 *   调校型与关联强化项图标联动：用其 target 强化项的 effectPrefix 解析图标（原版就是二合一图标）。
 *
 * ★二选一合并：当多个调校槽的 target 互为二选一（同 choiceGroup）时，合并成只显示一个：
 *   - 优先显示 target 已被玩家选中的那个调校槽
 *   - 都没选时，显示 choiceGroup 主选项（flag 最小）对应的调校槽
 *   这样第三槽始终只有一个图标位，跟随强化项选择联动
 *
 * @param choiceGroups 从 resolveEnhanceTreeVM 取得，用于判定调校 target 是否互为二选一
 */
export function resolveTuneRowVM(
  store: ClientDataStore,
  shipId: string,
  slotId: string,
  acquired: Map<string, number>,
  choiceGroups?: Record<string, ChoiceGroup>
): TuneSlotVM[] {
  const result: TuneSlotVM[] = [];
  const sysEnh = store.systemEnhance as Record<string, Record<string, unknown>>;
  const sysEff = store.systemEffect;
  if (!sysEnh || !sysEff) return result;

  // ★构建 enhanceId → choiceGroup 反查表（判定调校 target 是否在二选一桶里）
  const choiceGroupByEnhanceId: Map<string, ChoiceGroup> = new Map();
  if (choiceGroups) {
    for (const grp of Object.values(choiceGroups)) {
      for (const opt of grp.options) {
        choiceGroupByEnhanceId.set(opt.enhanceId, grp);
      }
    }
  }

  // 1. 前置解锁槽: UNLOCK_TYPE===2（永久加成槽 + 纯消费槽，无等级，cost=[0]）
  //    ★文档§2.1 三步链前两步；optIdx 不固定（4-12 浮动），只能靠 UNLOCK_TYPE=2 识别
  //    数据特征：UNLOCK_TYPE=2 + ENHANCE_COST=[0] + UNLOCK_COST_RARITY（解锁消耗）
  const unlockIds: string[] = [];
  for (const eid in sysEnh) {
    if (!eid.startsWith(slotId) || eid.length !== 9) continue;
    const rec = sysEnh[eid];
    if (rec.UNLOCK_TYPE !== 2) continue;
    unlockIds.push(eid);
  }
  unlockIds.sort();

  // 2. 调校型槽: resolveTuneSystem 按 slotId 过滤
  const tuneSlotsRaw = resolveTuneSystem(store, shipId).tuneSlots.filter((t) => t.slotId === slotId);

  // ★二选一合并：target 互为二选一（同 choiceGroup）的调校槽只保留一个
  //   - 玩家已选某强化项 → 保留关联该强化项的调校槽
  //   - 都没选 → 保留 choiceGroup 主选项（flag 最小，即 options[0]）对应的调校槽
  //   - 无 choiceGroup 关联的调校槽（普通 1:1）→ 直接保留
  const seenGroup = new Set<string>(); // 已处理的 choiceGroup key（避免重复保留）
  const tuneSlots = tuneSlotsRaw.filter((t) => {
    if (!t.targetEnhanceId || !choiceGroups) return true; // 无关联或无 choiceGroups → 保留
    const grp = choiceGroupByEnhanceId.get(t.targetEnhanceId);
    if (!grp) return true; // target 不在任何二选一桶 → 普通调校，保留
    // target 在二选一桶里：同组只保留一个
    if (seenGroup.has(grp.key)) return false; // 同组已处理过 → 丢弃
    seenGroup.add(grp.key);
    // 决定保留哪个：若玩家已选某 target，且当前调校槽的 target 正是它 → 保留当前
    //   否则（都没选，或当前不是已选的）→ 只在"主选项对应"时保留
    if (grp.selectedEnhanceId) {
      // 玩家已选：保留 target === selectedEnhanceId 的那个
      return t.targetEnhanceId === grp.selectedEnhanceId;
    }
    // 都没选：保留 target === 主选项(options[0]) 的那个
    return t.targetEnhanceId === grp.options[0].enhanceId;
  });

  // 3. 合并 + 构建 VM
  // 解锁型（永远显示）
  for (const eid of unlockIds) {
    const rec = sysEnh[eid];
    const oi = parseInt(eid.slice(7, 9), 10);
    const pf = Number(rec.SYSTEM_EFFECT_PREFIX);
    const eff = sysEff[String(pf) + "01"] as Record<string, unknown> | undefined;
    const level = acquired.get(eid) ?? 0;
    result.push({
      enhanceId: eid,
      slotId,
      optIdx: oi,
      type: "unlock",
      name: String(eff?.NAME ?? eid),
      icon: prefixIcon(pf),
      effectName: String(eff?.NAME ?? ""),
      effectId: Number(eff?.EFFECT_ID ?? 0),
      param: Number(eff?.EFFECT_PARAM ?? 0),
      state: level > 0 ? "active" : "available",
      currentLevel: level,
      maxLevel: 1,
    });
  }
  // 调校型（永远显示，图标与关联强化项联动）
  for (const t of tuneSlots) {
    const level = acquired.get(t.enhanceId) ?? 0;
    // 门控: 目标强化项需已点
    const targetAcquired = (acquired.get(t.targetEnhanceId) ?? 0) > 0;
    // ★图标联动：调校项用其 target 强化项的 effectPrefix 解析图标（原版二合一图标语义）
    //   target 强化项的 effectPrefix 从 systemEnhance[targetEnhanceId].SYSTEM_EFFECT_PREFIX 取
    const targetRec = sysEnh[t.targetEnhanceId];
    const targetPrefix = targetRec ? Number(targetRec.SYSTEM_EFFECT_PREFIX) : 0;
    const linkedIcon = targetPrefix ? prefixIcon(targetPrefix) : prefixIcon(t.effectPrefix);
    result.push({
      enhanceId: t.enhanceId,
      slotId,
      optIdx: t.optIdx,
      type: "tune",
      name: t.effect?.name ?? t.enhanceId,
      icon: linkedIcon,
      effectName: t.effect?.name ?? "",
      effectId: t.effect?.effectId,
      param: t.effect?.param,
      adjustProb: t.adjustProb,
      targetEnhanceId: t.targetEnhanceId,
      rarity: t.rarity,
      state: !targetAcquired ? "locked" : level > 0 ? "active" : "available",
      currentLevel: level,
      maxLevel: 10,
    });
  }

  // 4. 前置链: 列表内按顺序, 前一个未 active 则后一个 locked
  for (let i = 1; i < result.length; i++) {
    if (result[i - 1].state !== "active") {
      result[i].state = "locked";
    }
  }

  return result;
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
    //   未强化(currentLevel=0)不加 + 前缀，已强化加 + 表示"再加一级的增量"
    const targetLevel = preview ? slot.maxLevel : currentLevel + 1;
    const targetDesc = byLv[String(targetLevel)] ?? nextDesc;

    const curNums = currentLevel > 0 ? extractNums(curDesc) : [];
    const targetNums = extractNums(targetDesc);
    // 模板: 部分强化用 curDesc(显示当前值), 未强化用 targetDesc(不显示当前值只显示差值)
    const template = currentLevel > 0 ? curDesc : targetDesc;
    // 差值数组: targetNums[i] - curNums[i] (未强化 curNums 当0)
    // ★是否加 "+" 前缀按强化状态判定：未强化(currentLevel=0)不加 "+"，已强化加 "+"(表示再加一级的增量)
    const incArr: string[] = [];
    for (let i = 0; i < targetNums.length; i++) {
      const cv = currentLevel > 0 ? (curNums[i] ?? 0) : 0;
      const d = targetNums[i] - cv;
      if (d > 0) {
        const raw = (targetDesc.match(NUM_RE) ?? [])[i] ?? "";
        const unit = raw.includes("%") ? "%" : "";
        incArr.push(currentLevel > 0 ? `+${d}${unit}` : `${d}${unit}`);
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

/**
 * ★取强化项的完整成本链（对齐客户端 `common.blueprint_utils.get_enhance_cost_list`）。
 *
 * 基础成本 = 普通项 ENHANCE_COST（如 [2,2,2,2,2]，5级）。
 * 若该普通项被巅峰 ex 项(optIdx70/71) 扩展了 maxLevel，则把 ex 项的
 * ENHANCE_COST 前 peakExtraMaxLevel 级拼接到基础链末尾（如 +[2,2] = 共7级成本）。
 *
 * ex 项的查找：通过 ADJUST_ENHANCE_INDEX 反向匹配（ex 项的 ADJ = 当前普通 optIdx），
 * 与 computePeakExtraByOptIdx 一致，不分 EFFECT_TYPE。
 *
 * @param store 配置数据
 * @param slot 普通强化项（optIdx 01-18）
 * @param peakExtra 该 optIdx 的巅峰额外 maxLevel（来自 computePeakExtraByOptIdx）
 */
export function getEnhanceCostList(
  store: ClientDataStore,
  slot: EnhanceSlot,
  peakExtra = 0
): number[] {
  const sysEnh = store.systemEnhance as
    | Record<string, { ENHANCE_COST?: number[]; ADJUST_ENHANCE_INDEX?: number }>
    | undefined;
  const baseCosts = sysEnh?.[slot.enhanceId]?.ENHANCE_COST ?? [];
  if (peakExtra <= 0) return baseCosts;
  // 找该 slot 下 optIdx70/71 的 ex 项（ADJUST_ENHANCE_INDEX 指向当前 slot.optIdx）
  const slotId = slot.slotId;
  let exCosts: number[] = [];
  for (let oi = 70; oi <= 71; oi++) {
    const exId = slotId + String(oi).padStart(2, "0");
    const rec = sysEnh?.[exId];
    if (!rec) continue;
    if (Number(rec.ADJUST_ENHANCE_INDEX) !== slot.optIdx) continue;
    const full = rec.ENHANCE_COST ?? [];
    exCosts = full.slice(0, peakExtra);
    break;
  }
  return [...baseCosts, ...exCosts];
}

/** 单级消耗（+1 级），含巅峰扩展级（对齐客户端 get_enhance_cost_list 拼接） */
export function singleCost(
  store: ClientDataStore,
  slot: EnhanceSlot,
  currentLevel: number,
  peakExtra = 0
): number {
  const costs = getEnhanceCostList(store, slot, peakExtra);
  return costs[currentLevel] ?? 0;
}

/** 加满总额（从 currentLevel 加到 maxLevel，含巅峰扩展级） */
export function fullCost(
  store: ClientDataStore,
  slot: EnhanceSlot,
  currentLevel: number,
  peakExtra = 0
): number {
  const costs = getEnhanceCostList(store, slot, peakExtra);
  let sum = 0;
  for (let i = currentLevel; i < costs.length; i++) sum += costs[i];
  return sum;
}
