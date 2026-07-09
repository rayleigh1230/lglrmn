/**
 * Codec 统一出口
 *
 * 模拟器结构化对象 ↔ 客户端字符串格式的双向转换。
 * 后续新增 modulesCodec（MODULES）等同层扩展。
 */
export {
  levelsToTechStr,
  techStrToLevels,
  type EnhanceLevelState,
} from "./enhanceCodec";

export {
  aircraftsToStr,
  strToAircrafts,
  type AircraftsState,
} from "./aircraftsCodec";
