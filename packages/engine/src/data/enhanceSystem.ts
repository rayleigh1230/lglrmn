/**
 * 强化系统数据层（强化项 meta + 等级数值查询）
 *
 * ★ 数据来源：store.systemEnhance（cfg_system_enhance.json，已加载）
 *   + store.systemEffect（cfg_system_effect.json，查效果数值）
 *
 * enhance_id = shipId(5) + slotId(2) + optIdx(2)，9 位。
 * optIdx 分段（不同系统）：
 *   - 01-11：普通强化项（本模块处理）
 *   - 20：系统维修机制槽（ENHANCE_COST=[0]，非强化链）
 *   - 31-43：调校槽（tuneSystem.ts 处理，本模块排除）
 *   - 70：巅峰附带强化（peakLevel.ts 处理，本模块排除）
 *
 * 数值查询：通过 SYSTEM_EFFECT_PREFIX 拼 level(补零2位) 查 system_effect。
 *   A类（有 EFFECT_PARAM_LEVEL）：查等级表取值（如龙骨结构增强）
 *   B类（无 PARAM_LEVEL，直接 EFFECT_PARAM）：按 level/maxLevel 线性缩放
 *
 * 效果分类（用于 UI 分组）：复用 blueprintResolver 的 EFFECT_CATEGORY 语义，
 *   按 EFFECT_LABEL 优先（结构/伤害/命中/速度/曲率/维修...），回退到 EFFECT_ID 映射。
 */
import type { ClientDataStore, RawSystemEffect } from './rawTypes.js';

/** 普通强化项 optIdx 范围（其余 optIdx 由调校/巅峰/维修模块处理） */
const NORMAL_OPTIDX_MIN = 1;
const NORMAL_OPTIDX_MAX = 18; // 排除 19(旗舰技能如舰队集火,cost=[0])/20(维修)/31-43(调校)/70(巅峰)

/** 单个强化槽（optIdx 1-19 的某一项） */
export interface EnhanceSlot {
  /** 9 位 enhanceId（shipId + slotId + optIdx） */
  enhanceId: string;
  /** 7 位 slotId（shipId + slot） */
  slotId: string;
  /** optIdx（1-19） */
  optIdx: number;
  /** 系统效果前缀（拼 level 查 system_effect） */
  effectPrefix: number;
  /** 最大强化等级（ENHANCE_COST 数组长度） */
  maxLevel: number;
  /** 默认等级（ENHANCE_DEFAULT_LEVEL，0 表示无默认） */
  defaultLevel: number;
  /** 是否解锁型（UNLOCK_TYPE=2，需消耗稀有度解锁） */
  isUnlockable: boolean;
  /** ★前置依赖 enhanceId 列表（来自 cfg_system_enhance_tree，空数组=根节点无前置） */
  prerequisites: string[];
  /** ★科技树列号（treeId，UI 布局用，同列纵向排列） */
  treeColumn: number;
  /** ★节点类型标记（0=普通，1/2=特殊解锁节点） */
  nodeFlag: number;
  /** 效果元信息（查 system_effect[prefix+"01"] 得，无记录时为 undefined） */
  effect?: {
    effectId: number;
    name: string;
    /** 效果分类标签（结构/伤害/命中/速度/曲率/维修/防御...） */
    label: string;
    desc: string;
    /** 是否有等级表（A类=true 用 PARAM_LEVEL，B类=false 用 PARAM 线性缩放） */
    hasLevelTable: boolean;
  };
}

/** 系统槽元信息（容器语义：系统是容器，模块是内容） */
export interface EnhanceSystemSlotInfo {
  /** 7 位 slotId */
  slotId: string;
  /** 系统名（cfg_ship_system.NAME） */
  systemName: string;
  /** 系统标签（装甲/火炮/动力...） */
  systemLabel: string;
  /** 系统类型 */
  systemType: number;
  /** GROUP（切换组标识） */
  group: number;
  /** 已装配模块 ID 列表（cfg_ship_slot cat 0-3，空数组=真空槽。cat: 0模块/1主武器/2副武器/3特种） */
  installedModuleIds: string[];
  /** ★是否装配了模块（空槽=false，空槽的强化项不生效） */
  hasModule: boolean;
  /** 是否切换组成员（同 GROUP≥2 成员） */
  isSwitchable: boolean;
  /** ★是否当前启用（单成员组恒 true；切换组只激活 enabledSlots 指定的成员） */
  isActive: boolean;
}

/** 舰船强化系统（按 slotId 分组的普通强化项） */
export interface ShipEnhanceSystem {
  shipId: string;
  /** slotId → 该槽的强化项列表（按 optIdx 升序） */
  bySlot: Record<string, EnhanceSlot[]>;
  /** 全部强化项（扁平，调试用） */
  allSlots: EnhanceSlot[];
  /** ★每个系统槽的元信息（容器语义，含模块装配状态） */
  slotInfos: Record<string, EnhanceSystemSlotInfo>;
}

/**
 * 解析舰船的强化系统（仅普通强化 optIdx 1-19，排除调校/巅峰/维修）。
 *
 * ★容器语义门控：系统是容器，模块是内容。空槽（无模块）的强化项不生效。
 *   - slotInfos 记录每个槽的模块装配状态（hasModule）和启用状态（isActive）
 *   - isEnhanceAvailable() 综合判断强化项是否可用（槽有模块 + 前置已解锁）
 *
 * @param store 配置数据
 * @param shipId 5 位舰船 ID
 * @param enabledSlots 启用的系统槽（切换组互斥，超主力舰模块选择用）。不传时切换组按默认成员启用。
 * @returns 强化系统（按 slotId 分组，含科技树前置 + 系统槽元信息）
 */
export function resolveEnhanceSystem(
  store: ClientDataStore,
  shipId: string,
  enabledSlots?: string[]
): ShipEnhanceSystem {
  const systemEnhance = store.systemEnhance;
  const systemEffect = store.systemEffect;
  const bySlot: Record<string, EnhanceSlot[]> = {};
  const allSlots: EnhanceSlot[] = [];

  if (!systemEnhance) return { shipId, bySlot, allSlots, slotInfos: {} };

  for (const enhanceId in systemEnhance) {
    if (!enhanceId.startsWith(shipId) || enhanceId.length !== 9) continue;
    const optIdx = parseInt(enhanceId.slice(7, 9), 10);
    // 只取普通强化 optIdx 1-18（排除 19旗舰/20维修/31-43调校/70巅峰）
    if (optIdx < NORMAL_OPTIDX_MIN || optIdx > NORMAL_OPTIDX_MAX) continue;

    const rec = systemEnhance[enhanceId];
    // ★排除 cost=[0] 或无 cost 的项（旗舰技能如炮弹改良/系统调校等解锁型，不消耗技能点）
    //   cost=[0] 的项 maxLevel 应为 0（[0].length===1 不能当 1 级）
    const costArr = rec.ENHANCE_COST;
    const isZeroCost = !costArr || costArr.length === 0 || (costArr.length === 1 && costArr[0] === 0);
    if (isZeroCost) continue;

    const slotId = enhanceId.slice(0, 7);
    const effectPrefix = Number(rec.SYSTEM_EFFECT_PREFIX);
    const maxLevel = costArr.length;
    const isUnlockable = rec.UNLOCK_TYPE === 2 || rec.UNLOCK_COST_RARITY != null;

    // ★查科技树前置（cfg_system_enhance_tree）
    const treeEntry = store.systemEnhanceTree?.[enhanceId];
    const { prerequisites, treeColumn, nodeFlag } = parseEnhanceTreeEntry(treeEntry);

    // 查效果元信息（system_effect[prefix + "01"]）
    let effect: EnhanceSlot['effect'];
    if (systemEffect && effectPrefix) {
      const effKey = String(effectPrefix) + '01';
      const eff = systemEffect[effKey] as RawSystemEffect | undefined;
      if (eff) {
        effect = {
          effectId: Number(eff.EFFECT_ID ?? -1),
          name: String(eff.NAME ?? ''),
          label: resolveEffectLabel(eff),
          desc: String(eff.DESC ?? ''),
          hasLevelTable: Boolean(eff.EFFECT_PARAM_LEVEL),
        };
      }
    }

    const slot: EnhanceSlot = {
      enhanceId,
      slotId,
      optIdx,
      effectPrefix,
      maxLevel,
      defaultLevel: Number(rec.ENHANCE_DEFAULT_LEVEL ?? 0),
      isUnlockable,
      prerequisites,
      treeColumn,
      nodeFlag,
      effect,
    };
    allSlots.push(slot);
    (bySlot[slotId] = bySlot[slotId] || []).push(slot);
  }

  // 各 slot 内按 optIdx 升序
  for (const sid in bySlot) {
    bySlot[sid].sort((a, b) => a.optIdx - b.optIdx);
  }

  // ★构建系统槽元信息（容器语义）
  const slotInfos = buildSlotInfos(store, shipId, bySlot, enabledSlots);

  return { shipId, bySlot, allSlots, slotInfos };
}

/**
 * 解析科技树条目 "parents;treeId" + flag → 前置/列号/节点类型。
 * parents="0" 或空 = 根节点（无前置）。
 */
function parseEnhanceTreeEntry(
  entry: [string, number] | undefined
): { prerequisites: string[]; treeColumn: number; nodeFlag: number } {
  if (!entry) return { prerequisites: [], treeColumn: 0, nodeFlag: 0 };
  const raw = Array.isArray(entry) ? entry[0] : String(entry);
  const nodeFlag = Array.isArray(entry) ? entry[1] : 0;
  const parts = raw.split(';');
  const parentsRaw = parts[0] ?? '';
  const treeColumn = Number(parts[1] ?? 0);
  // parents="0" 或空 = 根节点
  const prerequisites = parentsRaw === '0' || parentsRaw === ''
    ? []
    : parentsRaw.split(',').map((s) => s.trim()).filter(Boolean);
  return { prerequisites, treeColumn, nodeFlag: Number(nodeFlag) ?? 0 };
}

/**
 * 构建系统槽元信息（容器语义）。
 * 从 cfg_ship_system 取系统信息，cfg_ship_slot 取模块装配状态，
 * 按 GROUP 判定切换组 + enabledSlots 判定启用状态。
 */
function buildSlotInfos(
  store: ClientDataStore,
  shipId: string,
  bySlot: Record<string, EnhanceSlot[]>,
  enabledSlots?: string[]
): Record<string, EnhanceSystemSlotInfo> {
  const shipSystem = store.shipSystem as Record<string, Record<string, unknown>> | undefined;
  const shipSlot = store.shipSlot as Record<string, unknown[]> | undefined;
  const result: Record<string, EnhanceSystemSlotInfo> = {};
  if (!shipSystem) return result;

  // 收集每个 slotId 的已装配模块（cfg_ship_slot cat 0-3 都是有效装配槽）
  const slotModules: Record<string, string[]> = {};
  if (shipSlot) {
    for (const slotKey in shipSlot) {
      if (!slotKey.startsWith(shipId)) continue;
      const row = shipSlot[slotKey];
      if (Number(row[0]) > 3) continue; // cat 0-3 都是有效装配槽(0模块/1主武器/2副武器/3特种)，依据 docs/10 字段字典 5.1
      const sid = slotKey.slice(0, 7);
      const modId = String(row[2]);
      if (modId && modId !== '0') {
        (slotModules[sid] = slotModules[sid] || []).push(modId);
      }
    }
  }

  // 按 GROUP 分组系统（判定切换组）
  const groupMembers: Record<string, string[]> = {};
  for (const slotId in bySlot) {
    const sys = shipSystem[slotId];
    if (!sys) continue;
    const g = sys.GROUP;
    if (g != null) {
      (groupMembers[String(g)] = groupMembers[String(g)] || []).push(slotId);
    }
  }

  const enabledSet = enabledSlots ? new Set(enabledSlots) : null;

  for (const slotId in bySlot) {
    const sys = shipSystem[slotId] ?? {};
    const group = Number(sys.GROUP ?? 0);
    const members = group != null ? (groupMembers[String(group)] ?? [slotId]) : [slotId];
    const isSwitchable = members.length >= 2;
    const mods = slotModules[slotId] ?? [];
    const hasModule = mods.length > 0;

    // isActive：单成员组恒 true；切换组按 enabledSlots 或默认成员
    let isActive = true;
    if (isSwitchable) {
      if (enabledSet) {
        isActive = enabledSet.has(slotId);
      } else {
        // 默认启用第一个非 ADDITIONAL_SYS 的成员（与 resolveEnabledSystems 一致）
        const def = members.find((m) => {
          const s = shipSystem[m];
          return Number(s?.ADDITIONAL_SYS ?? 0) !== 1;
        });
        isActive = def === slotId || (!def && members[0] === slotId);
      }
    }

    result[slotId] = {
      slotId,
      systemName: String(sys.NAME ?? ''),
      systemLabel: String(sys.SYSTEM_LABEL ?? ''),
      systemType: Number(sys.SYSTEM_TYPE ?? 0),
      group,
      installedModuleIds: mods,
      hasModule,
      isSwitchable,
      isActive,
    };
  }
  return result;
}

/**
 * 取强化项在某等级的效果数值。
 *
 * 与 blueprintResolver.lookupEffect 同语义（A/B 两类）：
 *   A类（有 EFFECT_PARAM_LEVEL）：查 prefix+level 条目；若无则用基础条目 prefix+"01" 的等级表查 level。
 *   B类（无 PARAM_LEVEL，直接 EFFECT_PARAM）：用基础条目 prefix+"01" 的 PARAM × level / maxLevel 线性缩放。
 *
 * 注：很多 B类强化只在 system_effect 里存了 prefix+"01" 一条基础记录（PARAM 是满级值），
 * 高等级条目不存在，因此必须用基础条目缩放，不能直接查 prefix+level。
 *
 * @param store 配置数据
 * @param enhanceId 9 位 enhanceId
 * @param level 强化等级（1 起）
 * @returns 数值（未按 EFFECT_ID 转译，单位取决于机制）；查不到返回 0
 */
export function getEnhanceValue(store: ClientDataStore, enhanceId: string, level: number): number {
  const systemEnhance = store.systemEnhance;
  const systemEffect = store.systemEffect;
  if (!systemEnhance || !systemEffect) return 0;

  const rec = systemEnhance[enhanceId];
  if (!rec) return 0;
  const effectPrefix = Number(rec.SYSTEM_EFFECT_PREFIX);
  if (!effectPrefix) return 0;
  const maxLevel = rec.ENHANCE_COST?.length ?? 0;

  // 优先查 prefix+level 精确条目（A类每级都有独立记录时命中）
  const directKey = String(effectPrefix) + String(level).padStart(2, '0');
  const direct = systemEffect[directKey] as RawSystemEffect | undefined;
  if (direct?.EFFECT_PARAM_LEVEL) {
    // A类：该等级条目自带等级表，查 level
    return lookupParamLevel(direct.EFFECT_PARAM_LEVEL, level);
  }
  if (direct && level > 0) {
    // 该等级有独立条目且无等级表 → 直接用其 PARAM（部分 B类每级都存值）
    return Number(direct.EFFECT_PARAM ?? 0);
  }

  // 回退到基础条目 prefix+"01"
  const baseKey = String(effectPrefix) + '01';
  const base = systemEffect[baseKey] as RawSystemEffect | undefined;
  if (!base) return 0;

  // A类：基础条目带等级表，查 level
  if (base.EFFECT_PARAM_LEVEL) {
    return lookupParamLevel(base.EFFECT_PARAM_LEVEL, level);
  }
  // B类：基础条目 PARAM × level / maxLevel 线性缩放
  const baseParam = Number(base.EFFECT_PARAM ?? 0);
  if (maxLevel > 0) {
    return (baseParam * level) / maxLevel;
  }
  return baseParam;
}

/** 解析 EFFECT_PARAM_LEVEL "1,200;2,400;..." 取指定 level 的值 */
function lookupParamLevel(paramLevel: string, level: number): number {
  for (const entry of paramLevel.split(';')) {
    const s = entry.trim();
    if (!s) continue;
    const [lv, val] = s.split(',').map(Number);
    if (lv === level) return val;
  }
  return 0;
}

/**
 * 推断效果分类标签（用于 UI 分组）。
 * 优先用 system_effect 自带的 EFFECT_LABEL（结构/伤害/命中/速度...），
 * 回退到 EFFECT_ID 数值范围启发式。
 */
function resolveEffectLabel(eff: RawSystemEffect): string {
  const label = String((eff as Record<string, unknown>).EFFECT_LABEL ?? '').trim();
  if (label) return label;
  // 回退：按 EFFECT_ID 大致分类
  const eid = Number(eff.EFFECT_ID ?? 0);
  if (eid === 10 || eid === 12) return '结构';
  if (eid === 1) return '常规';
  if (eid === 2 || eid === 16) return '曲率';
  if (eid === 14) return '常规';
  if (eid >= 12010 && eid <= 12019) return '命中';
  if (eid >= 12020 && eid <= 12049) return '伤害';
  if (eid >= 12030 && eid <= 12039) return '暴击';
  if (eid >= 12050 && eid <= 12059) return '维修';
  return '其他';
}

// ===== 科技树门控与布局 =====

/** isEnhanceAvailable 的判定结果 */
export interface EnhanceAvailability {
  available: boolean;
  /** 不可用的原因（空数组=可用） */
  reasons: string[];
}

/**
 * ★判断强化项是否可用（容器语义 + 科技树前置双重门控）。
 *
 * 可用条件（全部满足）：
 *   1. 所属系统槽已装配模块（hasModule=true，空槽强化项不生效）
 *   2. 所属系统槽当前启用（isActive=true，切换组只激活选中成员）
 *   3. 所有前置强化项已获得（prerequisites 全在 acquiredEnhanceIds 中）
 *
 * @param slot 强化项
 * @param slotInfo 所属系统槽元信息
 * @param acquiredEnhanceIds 已获得（已点等级）的强化项 ID 集合
 */
export function isEnhanceAvailable(
  slot: EnhanceSlot,
  slotInfo: EnhanceSystemSlotInfo,
  acquiredEnhanceIds: Set<string>
): EnhanceAvailability {
  const reasons: string[] = [];

  // 门控1：容器语义——系统槽必须有模块
  if (!slotInfo.hasModule) {
    reasons.push(`系统 ${slotInfo.systemName || slot.slotId} 未装配模块（空容器）`);
  }
  // 门控2：切换组——必须当前启用
  if (slotInfo.isSwitchable && !slotInfo.isActive) {
    reasons.push(`系统 ${slotInfo.systemName || slot.slotId} 未启用（切换组未选中）`);
  }
  // 门控3：科技树前置——所有前置必须已获得
  const unmet = slot.prerequisites.filter((p) => !acquiredEnhanceIds.has(p));
  if (unmet.length > 0) {
    reasons.push(`前置未解锁：${unmet.join(', ')}`);
  }

  return { available: reasons.length === 0, reasons };
}

/**
 * 取某系统槽的科技树（按 treeColumn 分列，便于 UI 纵向布局）。
 *
 * @param store 配置数据
 * @param shipId 5 位舰船 ID
 * @param slotId 7 位系统槽 ID
 * @returns columns=列号→该列强化项列表；roots=根节点（无前置）
 */
export function resolveEnhanceTree(
  store: ClientDataStore,
  shipId: string,
  slotId: string
): { columns: Record<number, EnhanceSlot[]>; roots: EnhanceSlot[] } {
  const sys = resolveEnhanceSystem(store, shipId);
  const slots = sys.bySlot[slotId] ?? [];
  const columns: Record<number, EnhanceSlot[]> = {};
  const roots: EnhanceSlot[] = [];
  for (const s of slots) {
    (columns[s.treeColumn] = columns[s.treeColumn] || []).push(s);
    if (s.prerequisites.length === 0) roots.push(s);
  }
  // 各列内按 optIdx 升序
  for (const col in columns) {
    columns[col].sort((a, b) => a.optIdx - b.optIdx);
  }
  return { columns, roots };
}
