/**
 * 引擎可调参数（待采样校准的未知量集中在此）
 *
 * 这些是官方未公开的黑盒数值，需要通过游戏内实测采样来标定。
 * 校准后只需改这一处，全引擎生效。详见 docs/02-采样测试方案.md。
 */

export interface EngineConfig {
  /**
   * 实弹保底伤害系数：保底 = 面板单发 × 此系数。
   *
   * 当 dph ≤ resistance（破不了甲）或 (dph − resistance) < 保底时，取保底值。
   *
   * 当前 0.1（10%）是基于首次实测的假设：FG300 单发30打抵抗36，实测每发=3=30×10%。
   * 待测试二（不同 dph 的破不了甲场景）确认是"按比例"还是"固定值"。
   */
  kineticFloorRatio: number;
}

/** 默认配置（基于实测假设，待测试二校准） */
export const DEFAULT_CONFIG: EngineConfig = {
  kineticFloorRatio: 0.1,
};

/** 当前生效配置（运行时可覆盖） */
let currentConfig: EngineConfig = { ...DEFAULT_CONFIG };

/** 获取当前配置 */
export function getConfig(): EngineConfig {
  return currentConfig;
}

/** 覆盖配置（用于采样校准后注入实测值） */
export function setConfig(over: Partial<EngineConfig>): void {
  currentConfig = { ...currentConfig, ...over };
}

/** 重置为默认配置 */
export function resetConfig(): void {
  currentConfig = { ...DEFAULT_CONFIG };
}
