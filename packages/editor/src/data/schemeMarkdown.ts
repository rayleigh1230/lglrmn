/**
 * 加点方案 markdown 解析/导出
 *
 * 格式（游戏「复制方案」生成的 markdown）：
 *   ###{船名}
 *   ##{系统名}
 *     #{强化名} {等级}级
 *     ...
 *
 * 解析链路：强化中文名 + 系统名 → enhanceId(9位)
 *   通过 resolveEnhanceSystem 输出构建反查表（不直读 cfg JSON）。
 *
 * 重名处理：同一(系统名+强化名)对应多个 enhanceId 时，全部赋同 level
 *   （重名多是同一强化的多节点/科技树链，游戏里靠位置区分，文本无法区分）。
 */
import type { ClientDataStore } from "../engine";
import { resolveEnhanceSystem } from "../engine";
import type { EnhanceLevels } from "../state/enhanceStore";

/** 解析出的 markdown 结构 */
export interface ParsedScheme {
  /** ### 头的船名（仅用于校验/提示，不参与 enhanceId 反查） */
  shipName: string;
  items: Array<{
    systemName: string;
    enhanceName: string;
    level: number;
  }>;
}

/** 反查结果 */
export interface ResolveResult {
  /** enhanceId(9位) → level */
  levels: Record<string, number>;
  /** 唯一匹配的强化项数 */
  resolved: number;
  /** 重名歧义（已全赋同 level）的强化项数 */
  ambiguous: number;
  /** 匹配不上的"系统名/强化名"列表 */
  unmatched: string[];
  /** ★方案涉及但当前未装配的切换组系统（需用户确认是否切换装配） */
  unloadedSystems: UnloadedSystem[];
  /** ★按方案对齐装配后的 enabledSlots（点"对齐并应用"时用） */
  alignedEnabledSlots: string[] | null;
}

/** 未装配系统信息（用于浮窗提示） */
export interface UnloadedSystem {
  systemName: string;
  slotId: string;
  /** 当前装配的同组系统名（可能是"无"） */
  currentActiveName: string;
}

/** 全角罗马数字 → ASCII 归一化（玩家输入法可能转全角） */
function normalizeRoman(s: string): string {
  const map: Record<string, string> = {
    "Ⅰ": "I", "Ⅱ": "II", "Ⅲ": "III", "Ⅳ": "IV", "Ⅴ": "V",
    "Ⅵ": "VI", "Ⅶ": "VII", "Ⅷ": "VIII", "Ⅸ": "IX", "Ⅹ": "X",
    "Ⅺ": "XI", "Ⅻ": "XII",
    "ⅰ": "I", "ⅱ": "II", "ⅲ": "III", "ⅳ": "IV", "ⅴ": "V",
    "ⅵ": "VI", "ⅶ": "VII", "ⅷ": "VIII", "ⅸ": "IX", "ⅹ": "X",
  };
  let r = s;
  for (const k in map) r = r.split(k).join(map[k]);
  return r;
}

/** 文本归一化：全角罗马 → ASCII、trim、合并空格 */
function norm(s: string): string {
  return normalizeRoman(s).replace(/\s+/g, " ").trim();
}

/**
 * 解析 markdown 文本为结构化方案
 * 容错：乱码/缺行不中断，尽量提取有效项
 */
export function parseMarkdown(text: string): ParsedScheme {
  let shipName = "";
  const items: ParsedScheme["items"] = [];
  let currentSystem = "";
  for (const rawLine of text.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (!line.trim()) continue;
    // 数 # 前缀（允许前导空格）
    const m = line.match(/^(\s*)(#+)\s*(.*)$/);
    if (!m) continue;
    const hashes = m[2].length;
    const content = m[3];
    if (hashes >= 3) {
      // 船名行（取第一个 ### ）
      if (!shipName) shipName = norm(content);
    } else if (hashes === 2) {
      currentSystem = norm(content);
    } else if (hashes === 1) {
      // 强化行："强化名 5级" 或 "强化名5级" 或 "强化名 5"
      let body = norm(content);
      // 剥离末尾"级"字
      body = body.replace(/级$/, "").trim();
      // 拆出末尾数字
      const lm = body.match(/^(.+?)\s*(\d+)$/);
      if (lm) {
        const enhanceName = norm(lm[1]);
        const level = parseInt(lm[2], 10);
        if (enhanceName && level > 0) {
          items.push({ systemName: currentSystem, enhanceName, level });
        }
      }
    }
  }
  return { shipName, items };
}

/**
 * 构建反查表：(系统名, 强化名) → [enhanceId...]
 * 基于 resolveEnhanceSystem 输出，仅含普通强化项（optIdx 1-18，排除调校/巅峰/维修/解锁）。
 */
export function buildNameIndex(
  store: ClientDataStore,
  shipId: string,
  enabledSlots?: string[]
): Map<string, string[]> {
  const sys = resolveEnhanceSystem(store, shipId, enabledSlots);
  const idx = new Map<string, string[]>();
  for (const slotId in sys.bySlot) {
    const systemName = norm(sys.slotInfos[slotId]?.systemName || "");
    for (const slot of sys.bySlot[slotId]) {
      const enhanceName = norm(slot.effect?.name || "");
      if (!systemName || !enhanceName) continue;
      const key = systemName + "||" + enhanceName;
      const arr = idx.get(key);
      if (arr) {
        if (!arr.includes(slot.enhanceId)) arr.push(slot.enhanceId);
      } else {
        idx.set(key, [slot.enhanceId]);
      }
    }
  }
  return idx;
}

/**
 * 把解析出的方案应用到 enhanceId
 * 重名（同一系统内多个同名 enhanceId）→ 全部赋同 level
 * ★严格按"系统名+强化名"匹配，不做全局名回退（避免跨系统误匹配切换组非默认成员）
 * ★检测未装配系统：方案涉及的切换组系统若当前未装配，记入 unloadedSystems
 *   并推导 alignedEnabledSlots（按方案对齐后的装配清单）
 */
export function resolveScheme(
  parsed: ParsedScheme,
  store: ClientDataStore,
  shipId: string,
  enabledSlots?: string[]
): ResolveResult {
  const sys = resolveEnhanceSystem(store, shipId, enabledSlots);
  const idx = new Map<string, string[]>();
  // 系统名(归一化) → slotId 列表（同名多系统时全列出，用于装配检测）
  const nameToSlots = new Map<string, string[]>();
  for (const slotId in sys.bySlot) {
    const systemName = norm(sys.slotInfos[slotId]?.systemName || "");
    if (!systemName) continue;
    // 反查表
    for (const slot of sys.bySlot[slotId]) {
      const enhanceName = norm(slot.effect?.name || "");
      if (!enhanceName) continue;
      const key = systemName + "||" + enhanceName;
      const arr = idx.get(key);
      if (arr) { if (!arr.includes(slot.enhanceId)) arr.push(slot.enhanceId); }
      else idx.set(key, [slot.enhanceId]);
    }
    // 系统名映射
    const sArr = nameToSlots.get(systemName);
    if (sArr) { if (!sArr.includes(slotId)) sArr.push(slotId); }
    else nameToSlots.set(systemName, [slotId]);
  }

  const levels: Record<string, number> = {};
  let resolved = 0;
  let ambiguous = 0;
  const unmatched: string[] = [];
  // 收集方案涉及的系统 slotId（去重）
  const schemeSlotIds = new Set<string>();
  for (const item of parsed.items) {
    const key = norm(item.systemName) + "||" + norm(item.enhanceName);
    const ids = idx.get(key);
    if (!ids || ids.length === 0) {
      unmatched.push(`${item.systemName}/${item.enhanceName}`);
    } else {
      for (const id of ids) levels[id] = item.level;
      if (ids.length > 1) ambiguous++;
      else resolved++;
    }
    // 记录方案涉及的系统
    const slots = nameToSlots.get(norm(item.systemName));
    if (slots) for (const s of slots) schemeSlotIds.add(s);
  }

  // 检测未装配系统 + 推导对齐后的 enabledSlots
  const unloadedSystems: UnloadedSystem[] = [];
  const hasSwitchable = Object.values(sys.slotInfos).some((si) => si.isSwitchable);
  let alignedEnabledSlots: string[] | null = null;
  if (hasSwitchable) {
    // 当前装配的切换组成员（isActive 的切换组系统）
    const groupActive = new Map<string, string>(); // group → 当前激活成员 slotId
    for (const slotId in sys.slotInfos) {
      const si = sys.slotInfos[slotId];
      if (si.isSwitchable && si.isActive) {
        groupActive.set(String(si.group), slotId);
      }
    }
    // 遍历方案涉及的系统，找未装配的切换组成员
    const needSwitch = new Map<string, string>(); // group → 方案要求的 slotId
    for (const slotId of schemeSlotIds) {
      const si = sys.slotInfos[slotId];
      if (!si || !si.isSwitchable || si.isActive) continue;
      // 方案涉及但未装配的切换组系统
      const curActive = groupActive.get(String(si.group));
      unloadedSystems.push({
        systemName: si.systemName,
        slotId,
        currentActiveName: curActive
          ? (sys.slotInfos[curActive]?.systemName || "—")
          : "无（该组未装配）",
      });
      needSwitch.set(String(si.group), slotId);
    }
    // ★对齐推导：先重置到初始默认装配，再按方案覆盖涉及的组
    //   初始默认 = 不传 enabledSlots 时各组的默认成员（第一个非 ADDITIONAL_SYS）
    //   方案涉及的组 = 按方案指定的成员（同组互斥）
    //   方案没涉及的组 = 保持初始默认成员（不是用户当前选择，确保确定性）
    if (needSwitch.size > 0 || schemeSlotIds.size > 0) {
      // 拿初始默认装配状态（不传 enabledSlots）
      const sysInitial = resolveEnhanceSystem(store, shipId);
      const aligned = new Set<string>();
      for (const slotId in sysInitial.slotInfos) {
        const si = sysInitial.slotInfos[slotId];
        if (!si.isSwitchable) continue;
        const g = String(si.group);
        if (needSwitch.has(g)) {
          // 方案涉及的组：只激活方案指定的成员
          if (slotId === needSwitch.get(g)) aligned.add(slotId);
        } else if (si.isActive) {
          // 方案没涉及的组：用初始默认成员（重置用户的手动选择）
          aligned.add(slotId);
        }
      }
      alignedEnabledSlots = [...aligned];
    }
  }

  return { levels, resolved, ambiguous, unmatched, unloadedSystems, alignedEnabledSlots };
}

/** 取船全名 */
function shipFullName(store: ClientDataStore, shipId: string): string {
  const row = store.ship?.[shipId];
  return row ? String(row[0] ?? "") : shipId;
}

/**
 * 导出加点为 markdown（与游戏格式一致）
 * 从 levels(enhanceId→level) 反查系统名+强化名，按系统分组。
 */
export function exportMarkdown(
  store: ClientDataStore,
  shipId: string,
  levels: EnhanceLevels,
  enabledSlots?: string[]
): string {
  const sys = resolveEnhanceSystem(store, shipId, enabledSlots);
  // enhanceId → {systemName, enhanceName, level}
  const bySystem = new Map<string, { systemName: string; lines: string[] }>();
  for (const slotId in sys.bySlot) {
    const systemName = sys.slotInfos[slotId]?.systemName || "";
    for (const slot of sys.bySlot[slotId]) {
      const lv = levels[slot.enhanceId];
      if (!lv || lv < 1) continue;
      const name = slot.effect?.name || "";
      if (!name) continue;
      if (!bySystem.has(slotId)) bySystem.set(slotId, { systemName, lines: [] });
      bySystem.get(slotId)!.lines.push(`  #${name} ${lv}级`);
    }
  }
  const parts: string[] = [];
  parts.push(`###${shipFullName(store, shipId)}`);
  for (const [, v] of bySystem) {
    parts.push(`##${v.systemName}`);
    parts.push(...v.lines);
  }
  return parts.join("\n");
}
