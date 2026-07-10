/**
 * 存档系统数据契约（与客户端 ship_record / team_record 对齐）
 *
 * 架构：
 *   - ships 是船档案池（按实例 uid 索引，支持同船型多实例）
 *   - teams 是编队列表（引用 ships 池的 uid）
 *   - 数据访问层 LoadoutRepository 为云开发阶段预留同接口
 *
 * 客户端字段映射见 docs/15-客户端公式反编译专题.md 与本文件字段 JSDoc。
 */

/** 单船档案（对齐客户端 ship_record 战斗相关字段） */
export interface ShipRecord {
  /** 实例唯一 ID。对应客户端 ShipField.SHIP_ID_U。迁移期使用原 shipId 作 uid */
  uid: string;
  /** 船型 ID（5 位，指向 cfg_ship）。对应客户端 ShipField.SHIP_ID */
  shipId: string;
  /** 蓝图 ID。对应客户端 ShipField.BP_ID */
  bpId?: string;
  /** 巅峰等级 0-20。对应客户端 ShipField.EFFECTS_PEAK_LEVEL */
  peakLevel: number;
  /**
   * 强化等级映射（enhanceId9位 → level）。
   * 序列化时通过 codec 转为客户端 ShipField.EFFECTS_ENHANCED 字符串格式
   */
  enhanceLevels: Record<string, number>;
  /**
   * 超主力舰装配清单：启用的 systemId 列表。
   * 对应客户端 ShipField.SUPER_MAIN_SHIP_BP_SYSTEM_SCHEME_SYSTEMS。
   * 客户端的 ShipField.MODULES（武器模块串）不直接存储——
   * 由引擎 resolveShipWeapons(store, shipId, enabledSlots) 推导
   */
  enabledSlots: string[];
  /** 蓝图方案 UID。对应客户端 ShipField.SUPER_MAIN_SHIP_BP_SYSTEM_SCHEME_UNIQUE_ID */
  bpSystemSchemeUniqueId?: string;
  /** A类载机（无人机）搭载：shipId → 各槽数量（模块路径用）。
   *  对应客户端 ShipField.AIRCRAFTS。B类载机改用 aircraftUids 引用 ships 池实例。 */
  aircrafts?: Record<string, number[]>;
  /** B类载机（战机/护航艇）实例引用：shipId → uid 列表（指向 Loadout.ships 池）。
   *  载机自身强化/巅峰存在 ships 池对应的 ShipRecord 里（和普通舰船同构）。 */
  aircraftUids?: Record<string, string[]>;
  /** 备注/自定义名（模拟器专用，无客户端对应） */
  note?: string;
}

/** 阵型配置占位（本轮不实现细节，仅预留接口供后续扩展） */
export interface FormationConfig {
  /** 后续扩展：站位坐标、阵型类型等 */
  [k: string]: unknown;
}

/** 编队配置（对齐客户端 team_record 战斗相关字段） */
export interface TeamConfig {
  /** 编队唯一 ID。对应客户端 TeamField.TEAM_ID */
  id: string;
  /** 编队名。对应客户端 TeamField.NAME */
  name: string;
  /** 编队类型。对应客户端 TeamField.TEAM_TYPE */
  type?: string;
  /** 旗舰 uid。对应客户端 TeamField.FLAGSHIP_ID_U，指向 Loadout.ships 池 */
  flagshipUid: string;
  /** 成员 uid 列表。对应客户端 TeamField.SHIP_INFO_NEW，引用 Loadout.ships 池 */
  memberUids: string[];
  /** 阵型/站位。对应客户端 TeamField.POS_COORDINATE（本轮预留接口） */
  formation?: FormationConfig;
  /** 属性位串。对应客户端 TeamField.ATTR_STR */
  attrFlags?: number;
  /** 备注（模拟器专用） */
  note?: string;
}

/** 整套配置存档 */
export interface Loadout {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  /** 船档案池（按实例 uid 索引，支持同船型多实例） */
  ships: Record<string, ShipRecord>;
  /** 编队列表（引用 ships 池中的 uid） */
  teams: TeamConfig[];
}

/** 数据访问层接口 —— 云开发阶段可换 CloudRepo 实现，业务层不动 */
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

/** 当前存档结构版本。v2 = ShipConfig→ShipRecord + teams 编队引入 */
export const CURRENT_VERSION = 2;

/** 生成简易唯一 id（本地用即可） */
export function genId(): string {
  return (
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 8)
  );
}

/** 存档序列化辅助：从空状态构造一个 Loadout */
export function createLoadout(
  name: string,
  ships: Record<string, ShipRecord> = {},
  teams: TeamConfig[] = []
): Loadout {
  const now = Date.now();
  return {
    id: genId(),
    name,
    createdAt: now,
    updatedAt: now,
    ships,
    teams,
  };
}
