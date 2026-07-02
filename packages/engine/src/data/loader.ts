/**
 * 配置表加载器（平台无关）
 *
 * 设计原则：数据层与引擎核心一样保持平台无关（可被 Node / 小程序 / Web 复用），
 * 因此本模块**不做文件 I/O**，只接收"已解析的 JSON 对象"，做类型断言 + 组装。
 *
 * 文件读取由调用方完成：
 *   - Node 测试/脚本：用 nodeUtils.ts 的 loadClientDataFromDir（便利方法）
 *   - 小程序：用其存储 API 读取后传入 createClientData
 *   - Web：用 fetch 读取后传入 createClientData
 */
import type {
  ClientDataStore,
  RawShipTable,
  RawSystemEffectTable,
  RawSystemEnhanceTable,
  RawEffectDefTable,
  RawShipTypeRow,
} from './rawTypes.js';

/** 配置表各部分的已解析 JSON（调用方负责读取文件并 JSON.parse） */
export interface ClientDataParts {
  /** 核心7张表（必需） */
  ship: RawShipTable;
  systemEffect: RawSystemEffectTable;
  systemEnhance: RawSystemEnhanceTable;
  effectDef: RawEffectDefTable;
  weapon?: Record<string, Record<string, unknown>>;
  shipSlot?: Record<string, unknown[]>;
  shipSystem?: Record<string, import('./rawTypes.js').RawShipSystem>;
  /** 扩展表（可选，按需加载） */
  shipType?: Record<string, RawShipTypeRow>;
  shipBlueprint?: Record<string, unknown[]>;
  weaponAction?: Record<string, unknown[]>;
  weaponPriority?: Record<string, unknown[]>;
  moduleEffect?: Record<string, Record<string, unknown>>;
}

/**
 * 从已解析的 JSON 对象组装配置表存储（平台无关，核心入口）。
 *
 * @param parts 各配置表的已解析 JSON
 * @returns 类型化的配置表存储，可被各 resolver 查询
 */
export function createClientData(parts: ClientDataParts): ClientDataStore {
  return {
    ship: parts.ship,
    systemEffect: parts.systemEffect,
    systemEnhance: parts.systemEnhance,
    effectDef: parts.effectDef,
    weapon: parts.weapon ?? {},
    shipSlot: parts.shipSlot ?? {},
    shipSystem: parts.shipSystem ?? {},
    shipType: parts.shipType ?? {},
    shipBlueprint: parts.shipBlueprint ?? {},
    weaponAction: parts.weaponAction ?? {},
    weaponPriority: parts.weaponPriority ?? {},
    moduleEffect: parts.moduleEffect ?? {},
  };
}
