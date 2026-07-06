/**
 * 存档系统数据契约（阶段1：本地存储）
 *
 * 架构：一个存档 = 所有船配置的整体快照（非 per-ship）
 * 数据访问层 LoadoutRepository 为阶段2（云开发）预留同接口
 */

/** 单船配置（提升自蓝图页原本地 state） */
export interface ShipConfig {
  /** enhanceId(9位) → level。覆盖强化(optIdx1-18)/调校(ADJUST_PROB)/解锁(UNLOCK_TYPE=2) */
  enhanceLevels: Record<string, number>;
  /** 巅峰等级 0-20 */
  peakLevel: number;
  /** 装配清单：超主力舰切换组选中的 systemId 列表 */
  enabledSlots: string[];
}

/** 整套配置存档（所有船的快照） */
export interface Loadout {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  /** shipId → 该船配置 */
  ships: Record<string, ShipConfig>;
}

/** 数据访问层接口 —— 阶段2 可换 CloudRepo 实现，业务层不动 */
export interface LoadoutRepository {
  list(): Promise<Loadout[]>;
  get(id: string): Promise<Loadout | null>;
  save(loadout: Loadout): Promise<void>;
  remove(id: string): Promise<void>;
}

/** 本地存储整体结构 */
export interface LocalStoreShape {
  /** 结构版本，预留迁移 */
  version: number;
  /** 当前激活的存档 id */
  activeId: string | null;
  loadouts: Loadout[];
}

/** 存档序列化辅助：从 store 快照构造一个 Loadout */
export function createLoadout(name: string, ships: Record<string, ShipConfig> = {}): Loadout {
  const now = Date.now();
  return {
    id: genId(),
    name,
    createdAt: now,
    updatedAt: now,
    ships,
  };
}

/** 生成简易唯一 id（无需严格 UUID，本地用即可） */
export function genId(): string {
  return (
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 8)
  );
}
