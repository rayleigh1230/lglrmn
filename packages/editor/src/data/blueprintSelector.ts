/**
 * 蓝图数据选择器: 从 ClientDataStore 提取 UI 需要的结构化数据
 *
 * cfg_ship_blueprint 字段索引 (来自调研):
 *   [0]  bp_id
 *   [1]  显示名 (斗牛级-脉冲炮驱逐舰-攻击型)
 *   [4]  建造成本
 *   [6]  舰种 tier (1战机/2轰炸机/3主力舰)
 *   [8]  子系统槽位列表 (逗号分隔3位前缀: "108,123,111,105")
 *   [11] 强化树节点组列表 (逗号分隔3位前缀)
 *   [15] ship_id链接 (0=基础舰用bp_id)
 *
 * cfg_ship 字段 (SHIP 常量):
 *   [0] 全名, [1] 短名, [3] ship_type, [4] 结构(HP), [5] 速度, [23] model code
 *
 * cfg_ship_system 字段 (RawShipSystem):
 *   SYSTEM_TYPE, NAME, SYSTEM_LABEL, MAIN_SYSTEM, HP, GROUP, ADDITIONAL_SYS
 */
import type { ClientDataStore } from "@lagrange/engine";
import { resolveAssembly } from "@lagrange/engine";

export interface ShipListItem {
  bpId: string;
  name: string;          // [1]
  cost: number;          // [4]
  shipTypeTier: number;  // [6]
  shipId: string;        // [15] or bpId
  hasShipStats: boolean; // 是否有对应 cfg_ship 记录
}

export interface ShipStats {
  shipId: string;
  fullName: string;
  shortName: string;
  shipType: number;     // cfg_ship[3]
  structure: number;    // [4]
  speed: number;        // [5]
  modelCode: string;    // [23]
}

export interface SubsystemInfo {
  systemId: string;     // 7位
  slot: string;         // 2位
  groupPrefix: string;  // 3位 (cfg_ship_blueprint[8] 的token)
  name: string;         // cfg_ship_system.NAME
  label: string;        // SYSTEM_LABEL
  systemType: number | undefined;  // SYSTEM_TYPE (2载机/3指挥/4装甲/5动力/6能源)
  isMain: boolean;
  hp: number;
}

/** 舰种 tier → 中文分类名 (cfg_ship_blueprint[6]) */
export function shipTypeTierName(tier: number): string {
  switch (tier) {
    case 1: return "战机/护航艇";
    case 2: return "轰炸机";
    case 3: return "主力舰";
    default: return "其他";
  }
}

/** SYSTEM_TYPE → 子系统分类 */
export function systemTypeName(sysType: number | undefined): string {
  switch (sysType) {
    case 2: return "载机";
    case 3: return "指挥";
    case 4: return "装甲";
    case 5: return "动力";
    case 6: return "能源";
    case undefined: return "武器";
    default: return "系统";
  }
}

/** 列出所有蓝图 (舰船列表数据源) */
export function listBlueprints(store: ClientDataStore): ShipListItem[] {
  const bp = store.shipBlueprint;
  if (!bp) return [];
  const result: ShipListItem[] = [];
  for (const bpId in bp) {
    const row = bp[bpId] as unknown[];
    const shipIdLink = row[15] as number;
    result.push({
      bpId,
      name: String(row[1] ?? ""),
      cost: Number(row[4] ?? 0),
      shipTypeTier: Number(row[6] ?? 0),
      shipId: shipIdLink === 0 ? bpId : String(shipIdLink),
      hasShipStats: shipIdLink !== 0 ? shipIdLink in (store.ship || {}) : bpId in (store.ship || {}),
    });
  }
  return result.sort((a, b) => a.shipTypeTier - b.shipTypeTier || a.name.localeCompare(b.name, "zh"));
}

/** 取单舰的属性 (cfg_ship) */
export function getShipStats(store: ClientDataStore, shipId: string): ShipStats | null {
  const row = store.ship?.[shipId];
  if (!row) return null;
  return {
    shipId,
    fullName: String(row[0] ?? ""),
    shortName: String(row[1] ?? ""),
    shipType: Number(row[3] ?? 0),
    structure: Number(row[4] ?? 0),
    speed: Number(row[5] ?? 0),
    modelCode: String(row[23] ?? ""),
  };
}

/** 取蓝图的子系统列表 (用 engine 的 resolveAssembly 权威解析) */
export function getBlueprintSubsystems(
  store: ClientDataStore,
  bpId: string
): SubsystemInfo[] {
  const bpRow = store.shipBlueprint?.[bpId] as unknown[] | undefined;
  if (!bpRow) return [];

  const shipIdLink = bpRow[15] as number;
  const shipId = shipIdLink === 0 ? bpId : String(shipIdLink);

  // resolveAssembly 的 enabledSlots 期望 systemId (如 "8020101") 或 slot(2位).
  // field[8] 是 3位 group 代码, 不直接对应. 传空串取所有固定子系统 + 可选默认.
  // 完整可选模块选择 UI 后续单独做 (需把 group→systemId 映射补全).
  try {
    const assembly = resolveAssembly(store, shipId, "");
    return assembly.systems.map((s) => ({
      systemId: s.systemId,
      slot: s.slot,
      groupPrefix: String(s.group ?? ""),
      name: s.name,
      label: s.isMain ? "主系统" : "子系统",
      systemType: undefined,
      isMain: s.isMain,
      hp: s.hp,
    }));
  } catch (e) {
    console.warn("[getBlueprintSubsystems] resolveAssembly failed:", e);
    return [];
  }
}

/** 取蓝图的强化树节点组前缀列表 (cfg_ship_blueprint[11]) */
export function getEnhanceTreeGroups(store: ClientDataStore, bpId: string): string[] {
  const bpRow = store.shipBlueprint?.[bpId] as unknown[] | undefined;
  if (!bpRow) return [];
  const treeStr = String(bpRow[11] ?? "");
  return treeStr.split(",").map((s) => s.trim()).filter(Boolean);
}

/** 筛选函数 */
export interface ShipFilter {
  keyword: string;
  shipTypeTier: number | null;  // null=全部
}

export function filterBlueprints(list: ShipListItem[], filter: ShipFilter): ShipListItem[] {
  let r = list;
  if (filter.shipTypeTier !== null) {
    r = r.filter((s) => s.shipTypeTier === filter.shipTypeTier);
  }
  const kw = filter.keyword.trim();
  if (kw) {
    r = r.filter((s) => s.name.includes(kw) || s.bpId.includes(kw) || s.shipId.includes(kw));
  }
  return r;
}
