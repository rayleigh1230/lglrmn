/**
 * 存档结构迁移
 *
 * v1 → v2 改造：
 *   - ShipConfig（key=shipId） → ShipRecord（uid 主键，shipId 字段指向船型）
 *   - Loadout 新增 teams: TeamConfig[]（老存档初始化为空数组）
 *
 * 迁移原则：
 *   - 字段无损——v1 的 shipId 直接当 uid 用，所有强化/巅峰/装配数据保留
 *   - 迁移前自动备份到 lagrange_loadouts_backup_v1，防回滚
 */
import type {
  LocalStoreShape,
  Loadout,
  ShipRecord,
} from "./types";
import { CURRENT_VERSION } from "./types";

/** 入口：把任意版本的 store 迁移到 CURRENT_VERSION */
export function migrate(store: LocalStoreShape): LocalStoreShape {
  if (store.version >= CURRENT_VERSION) return store;
  // 后续版本迁移链：v2→v3→... 在这里追加
  return migrateV1ToV2(store);
}

/** v1 → v2：ShipConfig（shipId 作 key） → ShipRecord（uid 作 key） + 空 teams */
export function migrateV1ToV2(store: LocalStoreShape): LocalStoreShape {
  if (store.version >= 2) return store;
  return {
    version: 2,
    activeId: store.activeId,
    loadouts: store.loadouts.map(migrateLoadoutV1ToV2),
  };
}

/** 单个 Loadout 的 v1→v2 迁移 */
function migrateLoadoutV1ToV2(old: any): Loadout {
  const ships: Record<string, ShipRecord> = {};
  const oldShips: Record<string, any> = old.ships ?? {};
  for (const shipId in oldShips) {
    const cfg = oldShips[shipId] ?? {};
    // v1 的 key（shipId）直接当 uid，零损失
    ships[shipId] = {
      uid: shipId,
      shipId,
      peakLevel: cfg.peakLevel ?? 0,
      enhanceLevels: cfg.enhanceLevels ?? {},
      enabledSlots: cfg.enabledSlots ?? [],
    };
  }
  return {
    id: old.id,
    name: old.name,
    createdAt: old.createdAt,
    updatedAt: old.updatedAt,
    ships,
    // 老存档没有编队概念，初始化为空数组
    teams: [],
  };
}
