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
import { SHIP_BP } from "./rawTypes.js";
import { AIRCRAFT_TYPE } from "./rawTypes.js";
import { resolveBlueprintPanel, type BlueprintPanel } from "./blueprintCalc.js";
import { resolveBlueprint } from "./blueprintResolver.js";
import { levelsToTechStr } from "./techString.js";

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
  /** A类载机（无人机）搭载：shipId → 各槽数量（模块路径用）。
   *  B类载机（战机/护航艇）改用 aircraftUids 引用 ships 池实例。 */
  aircrafts?: Record<string, number[]>;
  /** B类载机（战机/护航艇）实例引用：shipId → uid 列表（指向 ships 池）。
   *  载机自身强化/巅峰存在 ships 池对应的 ShipRecordInput 里。 */
  aircraftUids?: Record<string, string[]>;
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

// ===== 指挥值计算（单舰值取 cfg_ship[7]，舰队值逐船求和）=====

/**
 * 单船指挥值（对齐客户端编队 UI）。
 *
 * 指挥值取 cfg_ship[7]（SHIP.COMMAND）：白名单值域 1-55，按舰种递增
 * （航母 40-55、战列 45、战巡 28-35、护卫 3-8、战机/护航艇 1-2）。
 * 舰队总指挥值受上限约束（300-420，随指挥等级递增，见 validateFormation）。
 *
 * 注意：cfg_ship[13]（EXPLOIT_CAPACITY）是开采/驻泊容量（航母 11 万-15 万），
 * 不是游戏 UI 的"指挥值"——交接提交 7ad524d 曾误用 [13]，已回滚到 [7]。
 *
 * 模块加成：扫描该舰 cat=0 模块槽的 moduleEffect，聚合 EID=2034 绝对值。
 * install_num 取自 cfg_ship_slot[1]。EID=2035 比例通道暂略（数据中 2035 行数为 0）。
 * 强化通道（MA_SHIP_CAPACITY / EID=20）暂不实现（需 enhance 解析；面板默认无强化时
 * 基础值即最终值，后续 enhanceLevels 非空时再扩展）。
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
  // 基础指挥值 = cfg_ship[7]（COMMAND，白名单值域 1-55）
  const baseCapacity = Number(shipRow[SHIP.COMMAND] ?? 0) || 0;

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
 * 解析单船面板（含强化/巅峰），修复 resolveFormation 传 null 的缺口。
 *
 * 把 ShipRecordInput 的 enhanceLevels → techStr → resolveBlueprint（含强化/巅峰）
 * → resolveBlueprintPanel（含回填载机 DPS + 母舰强化透传）。
 * 对齐 editor 的 getShipPanel（blueprintSelector.ts:185）核心链路。
 *
 * @param ships 编队 ships 池（用于提取 B类载机实例配置）
 */
function resolveMemberPanel(
  store: ClientDataStore,
  rec: ShipRecordInput,
  ships?: Record<string, ShipRecordInput>,
): BlueprintPanel {
  // enhanceLevels → techStr
  const techStr = rec.enhanceLevels && Object.keys(rec.enhanceLevels).length > 0
    ? levelsToTechStr(store, rec.shipId, rec.enhanceLevels)
    : "";
  // resolveBlueprint（含强化/巅峰；无强化时 techStr="" 返回白板蓝图）
  const blueprint = (techStr || rec.peakLevel)
    ? resolveBlueprint(store, rec.shipId, techStr, { peakLevel: rec.peakLevel ?? 0 })
    : null;
  // B类载机实例池：从 rec.aircraftUids 收集 uid → 查 ships 池得载机配置
  let aircraftRecords: Record<string, ShipRecordInput> | undefined;
  if (rec.aircraftUids && ships) {
    aircraftRecords = {};
    for (const uids of Object.values(rec.aircraftUids)) {
      for (const uid of uids) {
        const ac = ships[uid];
        if (ac) aircraftRecords[uid] = ac;
      }
    }
    if (Object.keys(aircraftRecords).length === 0) aircraftRecords = undefined;
  }
  // resolveBlueprintPanel（含回填载机 DPS + 母舰强化透传给载机）
  return resolveBlueprintPanel(
    store, rec.shipId, '', blueprint, rec.enabledSlots, rec.aircrafts, aircraftRecords,
  );
}

// ===== 服役数校验（对齐 common.ship_utils.get_ship_blueprint_max_num）=====

/** 校验选项 */
export interface FormationValidateOptions {
  /** 舰队指挥值上限（300-420，随指挥等级递增，见 docs/01 §9.3）。缺省时不校验溢出。 */
  capacityCap?: number;
  /** 公会船坞开关：开启时跳过服役数校验（可用公会船坞的船突破单蓝图上限）。 */
  guildDock?: boolean;
}

/**
 * 取某蓝图的服役数上限（对齐 common.ship_utils.get_ship_blueprint_max_num）。
 * 读 cfg_ship_blueprint[bpId][7]（MAX_NUM）。
 * 实测档位：护卫/驱逐/战机/护航艇=10(未央15/雷火8)、巡洋=8(未央12)、
 * 战巡=6(特殊3)、支援=2-3、航母=5(特殊3)、战列=3。
 * @returns 服役数上限；无蓝图记录返回 0
 */
export function getServiceLimit(store: ClientDataStore, bpId: string): number {
  const bpRow = store.shipBlueprint?.[bpId] as unknown[] | undefined;
  if (!bpRow) return 0;
  return Number(bpRow[SHIP_BP.MAX_NUM] ?? 0) || 0;
}

/** 按蓝图 bpId 统计编队成员数。无 bpId 的成员按 shipId 计。 */
export function countByBlueprint(
  ships: Record<string, ShipRecordInput>,
  memberUids: string[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const uid of memberUids) {
    const rec = ships[uid];
    if (!rec) continue;
    const key = rec.bpId || rec.shipId;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

/**
 * 校验编队（指挥值上限 + 服役数上限）。
 * @param opts.capacityCap 舰队指挥值上限（300-420，随指挥等级递增，见 docs/01 §9.3）。缺省时不校验溢出。
 * @param opts.guildDock 公会船坞开关：开启时跳过服役数校验。
 */
export function validateFormation(
  store: ClientDataStore,
  team: TeamConfigInput,
  ships: Record<string, ShipRecordInput>,
  capacityCap?: number,
  opts?: FormationValidateOptions,
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
  // 服役数（公会船坞开启时跳过）
  if (!opts?.guildDock) {
    const bpCounts = countByBlueprint(ships, team.memberUids);
    for (const bpId in bpCounts) {
      const limit = getServiceLimit(store, bpId);
      if (limit > 0 && bpCounts[bpId] > limit) {
        errors.push(`服役数超限: ${bpId} 用量 ${bpCounts[bpId]} > 上限 ${limit}`);
      }
    }
  }
  return {
    ok: errors.length === 0,
    capacity: { used, cap: capacityCap ?? 0, overflow, overflowBy },
    errors,
  };
}

// ===== 战机规格校验（对齐 common.ship_utils.is_aircraft_avaliable_for_ship）=====

/**
 * 取战机/护航艇的规格（aircraft_type）。
 * 读 cfg_ship[19]（SHIP.AIRCRAFT_TYPE）：LIGHT=1/MID=2/HEAVY=3，护航艇=0。
 * @returns 规格值；非战机/护航艇或无记录返回 0
 */
export function getAircraftType(store: ClientDataStore, shipId: string): number {
  const shipRow = store.ship?.[shipId] as unknown[] | undefined;
  if (!shipRow) return 0;
  return Number(shipRow[SHIP.AIRCRAFT_TYPE] ?? 0) || 0;
}

/**
 * 判定战机能进哪种规格的机库（对齐 is_aircraft_avaliable_for_ship）。
 *
 * 规则（机库侧 shipNeedType → 战机能否进入）：
 *   HEAVY 机库(3) → 收 HEAVY + MID + LIGHT
 *   MID 机库(2)  → 收 MID + LIGHT
 *   LIGHT 机库(1) → 只收 LIGHT
 *   护航艇(0) → 无规格限制（所有护航艇坞舱都能进）
 *
 * @param aircraftType 战机自身规格（cfg_ship[19]）
 * @param shipNeedType 机库要求的规格
 */
export function isAircraftAvailableForShip(aircraftType: number, shipNeedType: number): boolean {
  if (shipNeedType === AIRCRAFT_TYPE.HEAVY) return true;       // 重型机库全收
  if (shipNeedType === AIRCRAFT_TYPE.MID) {
    return aircraftType === AIRCRAFT_TYPE.MID || aircraftType === AIRCRAFT_TYPE.LIGHT;
  }
  if (shipNeedType === AIRCRAFT_TYPE.LIGHT) {
    return aircraftType === AIRCRAFT_TYPE.LIGHT;
  }
  return false;
}

/**
 * 解析编队：聚合每船面板（火力/结构/载机）+ 指挥值，产出 ResolvedFormation。
 * 对齐客户端 UI 层逐船求和（无单一 fleet 函数）。
 *
 * @param capacityCap 指挥值上限（可选，用于 valid 判定）
 * @param opts.guildDock 公会船坞开关（开启时跳过服役数校验）
 */
export function resolveFormation(
  store: ClientDataStore,
  team: TeamConfigInput,
  ships: Record<string, ShipRecordInput>,
  capacityCap?: number,
  opts?: FormationValidateOptions,
): ResolvedFormation {
  const members: FormationMember[] = [];
  const totalFirepower = { antiShip: 0, antiAir: 0, siege: 0 };
  let totalStructure = 0;
  let usedCapacity = 0;

  for (const uid of team.memberUids) {
    const rec = ships[uid];
    if (!rec) continue;
    // 解析单船面板（含强化/巅峰 + 回填载机 DPS）
    const panel = resolveMemberPanel(store, rec, ships);
    const capacity = getShipCapacity(store, rec.shipId, rec.enabledSlots, rec.enhanceLevels);
    members.push({ uid, shipId: rec.shipId, panel, capacity });
    totalFirepower.antiShip += panel.firepower.antiShip;
    totalFirepower.antiAir += panel.firepower.antiAir;
    totalFirepower.siege += panel.firepower.siege;
    totalStructure += panel.finalStructure;
    usedCapacity += capacity;
  }
  void usedCapacity; // 已由 validateFormation 重新计算

  const validation = validateFormation(store, team, ships, capacityCap, opts);
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
