/**
 * 蓝图数据选择器
 *
 * 舰船白名单与分类来源: data/client/config/ship_whitelist.json
 *   该文件由 docs/舰船列表-已筛选完分类好.md 解析生成(用户人工筛选+分类)
 *   只有白名单内的 bpId 才显示，分类(舰型)也以白名单为准，不再靠关键词推断。
 */
import type { ClientDataStore } from "@lagrange/engine";
import { resolveAssembly, resolveBlueprintPanel } from "@lagrange/engine";
import type { BlueprintPanel } from "@lagrange/engine";

// ===== 舰型分类(顺序即底部图标栏顺序) =====
export interface ShipCategory {
  key: string;
  label: string;
  icon: string; // icon_ship_type_*.png
}

export const SHIP_CATEGORIES: ShipCategory[] = [
  { key: "护卫舰",     label: "护卫舰",     icon: "icon_ship_type_frigate.png" },
  { key: "驱逐舰",     label: "驱逐舰",     icon: "icon_ship_type_destroyer.png" },
  { key: "巡洋舰",     label: "巡洋舰",     icon: "icon_ship_type_cruiser.png" },
  { key: "战列巡洋舰", label: "战列巡洋舰", icon: "icon_ship_type_battle_cruiser.png" },
  { key: "战列舰",     label: "战列舰",     icon: "icon_ship_type_battle_ship.png" },
  { key: "航母",       label: "航母",       icon: "icon_ship_type_carrier.png" },
  { key: "支援舰",     label: "支援舰",     icon: "icon_ship_type_support_ship.png" },
  { key: "战机",       label: "战机",       icon: "icon_ship_type_fighter.png" },
  { key: "护航艇",     label: "护航艇",     icon: "icon_ship_type_boat.png" },
];

// 舰型 → 主题色(卡片左侧色条)
export const CATEGORY_COLOR: Record<string, string> = {
  "护卫舰": "#4ade80",
  "驱逐舰": "#4ade80",
  "巡洋舰": "#4ade80",
  "战列巡洋舰": "#ffc857",
  "战列舰": "#ffc857",
  "航母": "#ffc857",
  "支援舰": "#ffc857",
  "战机": "#4fc3f7",
  "护航艇": "#4fc3f7",
};

// ===== 白名单(运行时从 store 注入) =====
// key=bpId, value={category, shipId, name}
interface WhitelistEntry { category: string; shipId: string; name: string }
let _whitelist: Record<string, WhitelistEntry> | null = null;

export function setWhitelist(w: Record<string, WhitelistEntry>): void {
  _whitelist = w;
}

// ===== 数据结构 =====
export interface ShipListItem {
  bpId: string;
  name: string;
  shipId: string;
  category: string;      // 舰型(来自白名单)
  role: string;          // 定位(子型号: 对舰型/防空型等)
  rowLabel: string;      // 站位(前排/中排/后排/无)
  structure: number;     // 结构值 (cfg_ship)
  cost: number;          // 建造成本
}

/** ROW_INDEX → 站位标签 (战机艇用 rowIdx=0 但 category 是战机/护航艇 → 显示"无") */
export function rowIdxLabel(rowIdx: number, category: string): string {
  if (category === "战机" || category === "护航艇") return "无";
  if (rowIdx === 1) return "前排";
  if (rowIdx === 2) return "中排";
  return "后排";
}

/** 列出白名单内所有舰船 */
export function listBlueprints(store: ClientDataStore): ShipListItem[] {
  const bp = store.shipBlueprint;
  // 白名单优先从 store 读取(同步可用), 否则用全局注入的
  const whitelist = (store as any).shipWhitelist ?? _whitelist;
  if (!bp || !whitelist) return [];
  const result: ShipListItem[] = [];
  for (const bpId in whitelist) {
    const entry = whitelist[bpId];
    const row = bp[bpId] as unknown[] | undefined;
    const shipRow = store.ship?.[entry.shipId] ?? store.ship?.[bpId];
    const structure = shipRow ? Number(shipRow[4] ?? 0) : 0;
    const cost = row ? Number(row[4] ?? 0) : 0;
    result.push({
      bpId,
      name: entry.name,
      shipId: entry.shipId,
      category: entry.category,
      role: entry.role || "",
      rowLabel: entry.rowLabel || "无",
      structure,
      cost,
    });
  }
  // 按舰型顺序 → shipId 排序
  const catOrder = new Map(SHIP_CATEGORIES.map((c, i) => [c.key, i]));
  return result.sort(
    (a, b) =>
      (catOrder.get(a.category) ?? 99) - (catOrder.get(b.category) ?? 99) ||
      a.shipId.localeCompare(b.shipId)
  );
}

export interface ShipStats {
  shipId: string;
  fullName: string;
  shortName: string;
  structure: number;
  speed: number;
  modelCode: string;
}

export function getShipStats(store: ClientDataStore, shipId: string): ShipStats | null {
  const row = store.ship?.[shipId];
  if (!row) return null;
  return {
    shipId,
    fullName: String(row[0] ?? ""),
    shortName: String(row[1] ?? ""),
    structure: Number(row[4] ?? 0),
    speed: Number(row[5] ?? 0),
    modelCode: String(row[23] ?? ""),
  };
}

/** 取蓝图的子系统列表 */
export function getBlueprintSubsystems(store: ClientDataStore, bpId: string) {
  const entry = _whitelist?.[bpId];
  const shipId = entry?.shipId ?? bpId;
  try {
    const assembly = resolveAssembly(store, shipId, "");
    return assembly.systems.map((s) => ({
      systemId: s.systemId, slot: s.slot, groupPrefix: String(s.group ?? ""),
      name: s.name, label: s.isMain ? "主系统" : "子系统",
      isMain: s.isMain, hp: s.hp,
    }));
  } catch { return []; }
}

/** 取蓝图的强化树节点组前缀列表 */
export function getEnhanceTreeGroups(store: ClientDataStore, bpId: string): string[] {
  const bpRow = store.shipBlueprint?.[bpId] as unknown[] | undefined;
  if (!bpRow) return [];
  return String(bpRow[11] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

/** 筛选: 按舰型 */
export function filterByCategory(list: ShipListItem[], category: string | null): ShipListItem[] {
  if (category === null) return list;
  return list.filter((s) => s.category === category);
}

/** 筛选: 关键词搜索 */
export function searchShips(list: ShipListItem[], keyword: string): ShipListItem[] {
  const kw = keyword.trim();
  if (!kw) return list;
  return list.filter((s) => s.name.includes(kw) || s.bpId.includes(kw));
}

// ===== 舰船主面板数据 =====

export interface ShipPanelData {
  bpId: string;
  fullName: string;      // 舰船名+型号
  shipName: string;      // 舰船名
  subTypeName: string;   // 型号名
  category: string;      // 舰型
  rowLabel: string;      // 站位
  command: number;       // 指挥值
  shipId: string;
  // 计算层产出的面板数据
  panel: BlueprintPanel;
}

/** 取舰船面板数据（含火力/属性，走蓝图计算层） */
export function getShipPanel(store: ClientDataStore, bpId: string): ShipPanelData | null {
  const whitelist = (store as any).shipWhitelist ?? _whitelist;
  const entry = whitelist?.[bpId];
  if (!entry) return null;
  const bpRow = store.shipBlueprint?.[bpId] as unknown[] | undefined;
  const shipRow = store.ship?.[entry.shipId] as unknown[] | undefined;
  if (!shipRow) return null;
  const fullName = String(bpRow?.[1] ?? entry.name);
  const subType = String(bpRow?.[5] ?? "");
  const shipName = subType ? fullName.replace(new RegExp("-" + subType + "$"), "") : fullName;

  // 调用蓝图计算层（无强化状态，传 null 算基础面板）
  const panel = resolveBlueprintPanel(store, entry.shipId, shipName, null);

  return {
    bpId,
    fullName,
    shipName,
    subTypeName: subType,
    category: entry.category,
    rowLabel: entry.rowLabel || "无",
    command: Number(shipRow[7] ?? 0),
    shipId: entry.shipId,
    panel,
  };
}

export interface ShipVariant {
  bpId: string;
  subTypeName: string;  // 型号名(多功能型/装甲型)
  isCurrent: boolean;
}

/** 取同一舰船的所有型号(按 bpId 前3位分组) */
export function getVariants(store: ClientDataStore, bpId: string): ShipVariant[] {
  const whitelist = (store as any).shipWhitelist ?? _whitelist;
  if (!whitelist) return [];
  const prefix = bpId.slice(0, 3);
  const result: ShipVariant[] = [];
  for (const id in whitelist) {
    if (id.slice(0, 3) !== prefix) continue;
    const bpRow = store.shipBlueprint?.[id] as unknown[] | undefined;
    result.push({
      bpId: id,
      subTypeName: String(bpRow?.[5] ?? ""),
      isCurrent: id === bpId,
    });
  }
  return result.sort((a, b) => a.bpId.localeCompare(b.bpId));
}

export interface ShipSystemInfo {
  systemId: string;
  name: string;          // 系统名(中排指挥系统/装甲系统等)
  label: string;         // 系统类型(火炮/装甲/动力/能源/指挥)
  enhanceLimit: number;  // 强化项上限
  isMain: boolean;       // 是否主系统
}

/** 取舰船的所有子系统(用于加点状态展示) */
export function getShipSystems(store: ClientDataStore, shipId: string): ShipSystemInfo[] {
  const sys = store.shipSystem as Record<string, any> | undefined;
  if (!sys) return [];
  const result: ShipSystemInfo[] = [];
  for (const k in sys) {
    if (!k.startsWith(shipId)) continue;
    const s = sys[k];
    result.push({
      systemId: k,
      name: String(s.NAME ?? ""),
      label: String(s.SYSTEM_LABEL ?? ""),
      enhanceLimit: Number(s.ENHANCEMENTS_LIMIT ?? 0),
      isMain: Boolean(s.MAIN_SYSTEM),
    });
  }
  // 主系统排前面, 同类型按id排序
  return result.sort((a, b) => {
    if (a.isMain !== b.isMain) return a.isMain ? -1 : 1;
    return a.systemId.localeCompare(b.systemId);
  });
}
