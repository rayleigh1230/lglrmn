/**
 * 客户端数据层公共 API
 *
 * 数据层职责：把客户端配置表（frida dump 的 JSON）解析成引擎可用的结构。
 * 与引擎核心（types/core/phases）解耦——数据层产出 ResolvedBlueprint，
 * 后续里程碑再转换为引擎 Ship。
 *
 * 典型用法：
 *   import { loadClientData, resolveBlueprint } from '@lagrange/engine/data';
 *   const store = loadClientData('data/client/config');
 *   const bp = resolveBlueprint(store, '80201', cv3000TechStr);
 *   console.log(bp.finalStructure); // 370192
 */
export type {
  RawShipRow,
  RawShipTable,
  RawSystemEffect,
  RawSystemEffectTable,
  RawSystemEnhance,
  RawSystemEnhanceTable,
  RawEffectDefRow,
  RawEffectDefTable,
  ClientDataStore,
} from './rawTypes.js';

export { SHIP } from './rawTypes.js';

export { createClientData, type ClientDataParts } from './loader.js';

export { parseTechString, type TechModule } from './techString.js';

export {
  resolveBlueprint,
  type ResolvedEffect,
  type UnresolvedEffect,
  type ResolvedBlueprint,
  type BlueprintOptions,
} from './blueprintResolver.js';

export {
  resolveAssembly,
  getEnabledSystemIds,
  type AssembledSystem,
  type AssemblyResult,
  type AssemblyError,
} from './moduleAssembler.js';

export {
  parseBlock0,
  parseHpCurve,
  parseTeamBattleData,
  parseEnemyBattleData,
  type ParsedShipConfig,
  type HpSample,
} from './battleReportParser.js';

export {
  countTechPoints,
  type TechPointCost,
  type TechPointSummary,
} from './techPointCounter.js';

export {
  resolveShipWeapons,
  computeFirepower,
  getBaseDefense,
  resolveBlueprintPanel,
  type AssembledWeapon,
  type WeaponCategory,
  type BlueprintPanel,
} from './blueprintCalc.js';
