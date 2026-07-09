/**
 * 舰队编组数据层 —— 对齐客户端 team_record / get_team_capacity / get_ship_capicity
 *
 * 架构（对齐 HANDOVER-20260708 §B 双轨制编队）：
 *   - 输入 TeamConfig（旗舰 uid + 成员 uid 列表）+ ships 池（uid → ShipRecord）
 *   - 聚合每船的 BlueprintPanel（火力/结构，含回填后的载机 DPS）+ 指挥值占用
 *   - 校验指挥值上限（对齐 get_team_capacity）
 *
 * 客户端函数对齐：
 *   - getShipCapacity     ← common.ship_utils.get_ship_capicity
 *   - getTeamCapacity     ← common.team_utils.get_team_capacity
 *   - resolveFormation    ← UI 层逐船求和（客户端无单一 fleet 函数）
 *
 * 平台无关：输入类型（TeamConfigInput/ShipRecordInput）为最小结构契约，
 *   编辑器的 TeamConfig/ShipRecord 结构兼容（结构化类型，无需 import 编辑器包）。
 */
import type { ClientDataStore } from "./index.js";
import { SHIP } from "./rawTypes.js";
import { resolveBlueprintPanel, type BlueprintPanel } from "./blueprintCalc.js";

// ===== 模块容量效果常量（对齐 effect_enum_values.json）=====
/** EFFECT_MODULE_CAPACITY 模块容量基础值（绝对值，直接加）。EFFECT_MODULE_CAPACITY_INC(2035) 数据中 0 行，暂不处理。 */
const EFFECT_MODULE_CAPACITY = 2034;

// ===== 输入类型（最小结构契约，编辑器类型结构兼容）=====

/** 编队配置输入（对齐客户端 team_record 战斗相关字段） */
export interface TeamConfigInput {
  id: string;
  name?: string;
  type?: string;
  flagshipUid: string;
  memberUids: string[];
  formation?: { [k: string]: unknown };
  attrFlags?: number;
}

/** 单船档案输入（对齐客户端 ship_record 战斗相关字段） */
export interface ShipRecordInput {
  uid: string;
  shipId: string;
  bpId?: string;
  peakLevel?: number;
  enhanceLevels?: Record<string, number>;
  enabledSlots?: string[];
  bpSystemSchemeUniqueId?: string;
  aircrafts?: Record<string, number[]>;
}

// ===== 输出类型 =====

export interface FormationMember {
  uid: string;
  shipId: string;
  panel: BlueprintPanel;
  capacity: number;
}

export interface FormationCapacity {
  used: number;
  cap: number;
  overflow: boolean;
  overflowBy: number;
}

export interface ResolvedFormation {
  teamId: string;
  flagshipUid: string;
  members: FormationMember[];
  totalFirepower: { antiShip: number; antiAir: number; siege: number };
  totalStructure: number;
  capacity: FormationCapacity;
  valid: boolean;
}

/** 轻量聚合视图（不携带每船明细） */
export interface FormationPanel {
  totalFirepower: { antiShip: number; antiAir: number; siege: number };
  totalStructure: number;
  memberCount: number;
}

export interface FormationValidation {
  ok: boolean;
  capacity: FormationCapacity;
  errors: string[];
}

// ===== 容量计算（对齐 get_ship_capicity / get_team_capacity）=====

/**
 * 单船指挥值/容量（对齐 common.ship_utils.get_ship_capicity）。
 *
 * 客户端公式（get_ship_capicity.py）：
 *   capicity = cfg_ship[EXPLOIT_CAPACITY]                 // 基础容量（field[13]）
 *   if enhancements: ship_capacity = get_after_system_effect_value(enh, MA_SHIP_CAPACITY)
 *   else:             ship_capacity = capicity
 *   module_capacity = Σ over enabled modules:
 *       install_num × get_module_attr_value(MA_MODULE_CAPACITY)
 *     其中 MA_MODULE_CAPACITY → cfg_module_effect EFFECT_ID=2034(base) + 2035(inc_ratio)
 *   return int(ship_capacity + module_capacity)
 *
 * 本实现简化：
 *   - 基础容量 = cfg_ship[13]（对齐 EXPLOIT_CAPACITY，非旧实现误用的 [7]）。
 *   - 强化通道（MA_SHIP_CAPACITY / EFFECT_EXPLOIT_CAPACITY=EID20）暂不实现（需 enhance 解析，
 *     面板默认无强化时基础值即最终值；后续 enhanceLevels 非空时再扩展）。
 *   - 模块容量：扫描该舰 cat=0 模块槽的 moduleEffect，聚合 EID=2034 绝对值。
 *     install_num 取自 cfg_ship_slot[1]。EID=2035 比例通道暂略（数据中 2035 行数为 0）。
 *
 * @param store 配置表存储
 * @param shipId 5 位 ship_id
 * @param enabledSlots 启用的可选模块 systemId 列表
 * @param enhanceLevels 强化等级映射（MA_SHIP_CAPACITY 通道用，当前简化未实现）
 */
export function getShipCapacity(
  store: ClientDataStore,
  shipId: string,
  enabledSlots?: string[],
  enhanceLevels?: Record<string, number>,
): number {
  void enhanceLevels; // ★MA_SHIP_CAPACITY 强化通道待实现（当前面板默认无强化，基础值即最终值）
  const shipRow = store.ship?.[shipId] as unknown[] | undefined;
  if (!shipRow) return 0;
  // 基础容量 = cfg_ship[13]（EXPLOIT_CAPACITY）
  const baseCapacity = Number(shipRow[SHIP.EXPLOIT_CAPACITY] ?? 0) || 0;

  // 模块容量加成：扫描启用模块的 EFFECT_MODULE_CAPACITY(2034)
  const moduleCapacity = getModuleCapacity(store, shipId, enabledSlots);

  return Math.floor(baseCapacity + moduleCapacity);
}

/** 扫描该舰启用模块的 EFFECT_MODULE_CAPACITY(2034) 绝对值 × install_num。对齐 MA_MODULE_CAPACITY。 */
function getModuleCapacity(store: ClientDataStore, shipId: string, enabledSlots?: string[]): number {
  const shipSlot = store.shipSlot as Record<string, unknown[]> | undefined;
  const moduleEffect = store.moduleEffect as Record<string, Record<string, unknown>> | undefined;
  const shipSystem = store.shipSystem as Record<string, Record<string, unknown>> | undefined;
  if (!shipSlot || !moduleEffect) return 0;
  const enabledSysSet = shipSystem ? resolveEnabledSystemsLocal(shipSystem, shipId, enabledSlots) : null;
  let total = 0;
  const seenModule = new Set<string>();
  for (const slotId in shipSlot) {
    if (!slotId.startsWith(shipId)) continue;
    const row = shipSlot[slotId];
    if (Number(row[0]) !== 0) continue; // 只看模块槽
    const systemId = slotId.slice(0, 7);
    if (enabledSysSet && !enabledSysSet.has(systemId)) continue;
    const moduleId = String(row[2]);
    if (!moduleId || moduleId === "0" || seenModule.has(moduleId)) continue;
    seenModule.add(moduleId);
    const installNum = Number(row[1]) || 1;
    // moduleEffect key = moduleId + 2位序号
    for (const meKey in moduleEffect) {
      if (!meKey.startsWith(moduleId)) continue;
      const me = moduleEffect[meKey];
      const eid = Number(me.EFFECT_ID);
      if (eid === EFFECT_MODULE_CAPACITY) {
        total += Number(me.EFFECT_PARAM) * installNum;
      }
      // EID=2035(INC 比例) 数据中 0 行，暂不处理
    }
  }
  return total;
}

/** resolveEnabledSystems 本地副本（避免跨模块私有函数依赖）。逻辑与 blueprintCalc 同口径。 */
function resolveEnabledSystemsLocal(
  systems: Record<string, Record<string, unknown>>,
  shipId: string,
  enabledSlots?: string[],
): Set<string> | null {
  const enabledSet = enabledSlots ? new Set(enabledSlots) : null;
  const byGroup: Record<string, string[]> = {};
  for (const k in systems) {
    if (!k.startsWith(shipId)) continue;
    const g = systems[k].GROUP;
    const gKey = g != null ? String(g) : k;
    (byGroup[gKey] = byGroup[gKey] || []).push(k);
  }
  const result = new Set<string>();
  for (const gKey in byGroup) {
    const members = byGroup[gKey].sort((a, b) => a.localeCompare(b));
    if (members.length < 2) {
      result.add(members[0]);
      continue;
    }
    const userSel = enabledSet ? members.find((m) => enabledSet.has(m)) : null;
    if (userSel) {
      result.add(userSel);
    } else {
      const def = members.find((m) => Number(systems[m].ADDITIONAL_SYS ?? 0) !== 1);
      if (def) result.add(def);
    }
  }
  return result;
}

/**
 * 编队总指挥值（对齐 common.team_utils.get_team_capacity）。
 *
 * 客户端公式（get_team_capacity.py）：
 *   team_capacity = 0
 *   for ship_uid in get_ship_uid_list_of_team(team_id):
 *       team_capacity += ship_utils.get_ship_capicity(...)
 *   return team_capacity
 */
export function getTeamCapacity(
  store: ClientDataStore,
  team: TeamConfigInput,
  ships: Record<string, ShipRecordInput>,
): number {
  let total = 0;
  for (const uid of team.memberUids) {
    const rec = ships[uid];
    if (!rec) continue;
    total += getShipCapacity(store, rec.shipId, rec.enabledSlots, rec.enhanceLevels);
  }
  return total;
}

/**
 * 校验编队（指挥值上限等）。
 * @param capacityCap 指挥值上限（如 460；docs/01 §9.3）。缺省时不校验溢出。
 */
export function validateFormation(
  store: ClientDataStore,
  team: TeamConfigInput,
  ships: Record<string, ShipRecordInput>,
  capacityCap?: number,
): FormationValidation {
  const errors: string[] = [];
  // 成员存在性
  for (const uid of team.memberUids) {
    if (!ships[uid]) errors.push(`成员 uid=${uid} 不在 ships 池`);
  }
  // 旗舰存在
  if (team.flagshipUid && !ships[team.flagshipUid]) {
    errors.push(`旗舰 uid=${team.flagshipUid} 不在 ships 池`);
  }
  // 指挥值
  const used = getTeamCapacity(store, team, ships);
  let overflow = false;
  let overflowBy = 0;
  if (capacityCap != null && used > capacityCap) {
    overflow = true;
    overflowBy = used - capacityCap;
    errors.push(`指挥值超限: 用量 ${used} > 上限 ${capacityCap} (超 ${overflowBy})`);
  }
  return {
    ok: errors.length === 0,
    capacity: { used, cap: capacityCap ?? 0, overflow, overflowBy },
    errors,
  };
}

/**
 * 解析编队：聚合每船面板（火力/结构/载机）+ 指挥值，产出 ResolvedFormation。
 * 对齐客户端 UI 层逐船求和（无单一 fleet 函数）。
 *
 * @param capacityCap 指挥值上限（可选，用于 valid 判定）
 */
export function resolveFormation(
  store: ClientDataStore,
  team: TeamConfigInput,
  ships: Record<string, ShipRecordInput>,
  capacityCap?: number,
): ResolvedFormation {
  const members: FormationMember[] = [];
  const totalFirepower = { antiShip: 0, antiAir: 0, siege: 0 };
  let totalStructure = 0;
  let usedCapacity = 0;

  for (const uid of team.memberUids) {
    const rec = ships[uid];
    if (!rec) continue;
    // 解析单船面板（含回填载机 DPS；aircrafts 透传给 computeAircraftDps 双轨入口）
    const panel = resolveBlueprintPanel(
      store, rec.shipId, '', null, rec.enabledSlots, rec.aircrafts,
    );
    const capacity = getShipCapacity(store, rec.shipId, rec.enabledSlots, rec.enhanceLevels);
    members.push({ uid, shipId: rec.shipId, panel, capacity });
    totalFirepower.antiShip += panel.firepower.antiShip;
    totalFirepower.antiAir += panel.firepower.antiAir;
    totalFirepower.siege += panel.firepower.siege;
    totalStructure += panel.finalStructure;
    usedCapacity += capacity;
  }

  const validation = validateFormation(store, team, ships, capacityCap);
  return {
    teamId: team.id,
    flagshipUid: team.flagshipUid,
    members,
    totalFirepower,
    totalStructure,
    capacity: validation.capacity,
    valid: validation.ok,
  };
}
