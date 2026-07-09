/**
 * 超主力舰模块装配系统
 *
 * 超主力舰（航母/战列/战巡）比主力舰多一层"模块装配"维度：
 * - 固定子系统（装甲/动力/能源/指挥等）：始终启用
 * - 可选模块（ADDITIONAL_SYS=1）：玩家选装，同 GROUP 互斥（如载机系统二选一）
 *
 * 装配状态来源：
 * - 战报块0字段[12]：启用的 slotId 清单（如 "8020101,8020104,8020109,..."）
 * - UI 编辑器：用户选择装配哪些可选模块
 *
 * 数据流：装配清单 → 区分固定/可选 → GROUP 互斥校验 → 输出装配后的系统列表
 */
import type { ClientDataStore } from './rawTypes';

/** 一个子系统的装配状态 */
export interface AssembledSystem {
  /** 子系统 ID（7位 = shipId5 + slot2） */
  systemId: string;
  /** 槽位序号（2位） */
  slot: string;
  /** 系统名 */
  name: string;
  /** 是否固定子系统（始终启用） */
  isFixed: boolean;
  /** 是否可选模块 */
  isOptional: boolean;
  /** 所属组（同组互斥） */
  group: number | null;
  /** 是否当前启用 */
  enabled: boolean;
  /** 是否主系统 */
  isMain: boolean;
  /** 子系统 HP */
  hp: number;
}

/** 装配校验错误 */
export interface AssemblyError {
  /** 冲突的组号 */
  group: number;
  /** 同组中启用了多个模块 */
  conflictingSlots: string[];
  /** 描述 */
  message: string;
}

/** 装配结果 */
export interface AssemblyResult {
  shipId: string;
  /** 全部子系统（含启用/未启用状态） */
  systems: AssembledSystem[];
  /** 校验错误（GROUP 互斥冲突等） */
  errors: AssemblyError[];
}

/**
 * 解析装配清单，输出每个子系统的状态。
 *
 * @param store 配置表存储
 * @param shipId 舰船 ID（5位）
 * @param enabledSlots 启用的 slot 清单（如战报[12]字段 "8020101,8020104,..."，或字符串数组）
 * @returns 装配结果（含校验错误）
 */
export function resolveAssembly(
  store: ClientDataStore,
  shipId: string,
  enabledSlots: string | string[]
): AssemblyResult {
  // 解析启用清单
  const enabledSet = new Set(
    (Array.isArray(enabledSlots) ? enabledSlots : enabledSlots.split(','))
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
  );

  const systems: AssembledSystem[] = [];
  const errors: AssemblyError[] = [];

  // 遍历该船的所有子系统
  const prefix = shipId;
  for (const [systemId, sys] of Object.entries(store.shipSystem)) {
    if (!systemId.startsWith(prefix)) continue;
    const slot = systemId.slice(5);
    const isOptional = (sys.ADDITIONAL_SYS ?? 0) === 1;
    const isFixed = !isOptional;
    // 固定模块始终启用；可选模块按清单
    const enabled = isFixed || enabledSet.has(systemId) || enabledSet.has(slot);

    systems.push({
      systemId,
      slot,
      name: String(sys.NAME ?? '(无名)'),
      isFixed,
      isOptional,
      group: sys.GROUP ?? null,
      enabled,
      isMain: (sys.MAIN_SYSTEM ?? 0) === 1,
      hp: sys.HP ?? 0,
    });
  }

  // GROUP 互斥校验：同 GROUP 的可选模块只能启用一个
  const groupEnabled: Record<number, string[]> = {};
  for (const sys of systems) {
    if (sys.enabled && sys.isOptional && sys.group !== null) {
      (groupEnabled[sys.group] ??= []).push(sys.slot);
    }
  }
  for (const [group, slots] of Object.entries(groupEnabled)) {
    if (slots.length > 1) {
      errors.push({
        group: Number(group),
        conflictingSlots: slots,
        message: `GROUP ${group} 启用了多个互斥模块: ${slots.join(', ')}`,
      });
    }
  }

  return { shipId, systems, errors };
}

/**
 * 获取已启用的系统 ID 列表（用于科技串解析时过滤）。
 */
export function getEnabledSystemIds(result: AssemblyResult): string[] {
  return result.systems.filter((s) => s.enabled).map((s) => s.systemId);
}
