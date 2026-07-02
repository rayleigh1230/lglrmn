/**
 * 战报科技串解析器（纯函数，无外部依赖）
 *
 * 科技串格式（docs/11 §2.1）：每个 ';' 分隔一个槽位，槽位内是三元组：
 *   slotId, subType1, techId1, level1, subType2, techId2, level2, ...
 *
 * 例："8020109,2,1132,5,1,1131,5,8,8890,1"
 *   → slot 8020109 装载：
 *       (subType=2, techId=1132, level=5)
 *       (subType=1, techId=1131, level=5)
 *       (subType=8, techId=8890, level=1)
 */

/** 单个科技模块（槽位内一个三元组） */
export interface TechModule {
  /** 槽位 ID（7位 = shipId(5) + slot(2)），对应 cfg_ship_system */
  slotId: string;
  /** 子系统类型（1-20） */
  subType: number;
  /** 科技 ID（= cfg_system_enhance 的 SYSTEM_EFFECT_PREFIX） */
  techId: number;
  /** 强化等级（1-5） */
  level: number;
}

/**
 * 解析科技串为模块列表。
 *
 * 输入首段是 slotId，其后每 3 个数字为一个 (subType, techId, level) 三元组。
 * 容错：跳过无法解析的三元组（数量不足或非数字），不抛异常。
 *
 * @param techStr 原始科技串（战报块0 的字段）
 * @returns 所有槽位的所有模块（扁平化）
 */
export function parseTechString(techStr: string): TechModule[] {
  if (!techStr) return [];
  const result: TechModule[] = [];
  // 按槽位分段
  const slots = techStr.split(';').filter((s) => s.trim().length > 0);
  for (const slot of slots) {
    const parts = slot.split(',').map((p) => p.trim());
    if (parts.length < 1) continue;
    const slotId = parts[0];
    if (!slotId) continue;
    // parts[1..] 按三元组（步长3）解析
    for (let i = 1; i + 2 < parts.length + 1; i += 3) {
      const subType = Number(parts[i]);
      const techId = Number(parts[i + 1]);
      const level = Number(parts[i + 2]);
      // 任一非数字则跳过该三元组
      if (Number.isNaN(subType) || Number.isNaN(techId) || Number.isNaN(level)) continue;
      result.push({ slotId, subType, techId, level });
    }
  }
  return result;
}
