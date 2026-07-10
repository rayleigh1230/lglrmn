/**
 * 战报科技串解析器（纯函数，无外部依赖）
 *
 * 科技串格式（经游戏 parse_enhance_data 验证）：
 * 每个 ';' 分隔一个槽位，槽位内是三元组 (optIdx, PREFIX, level)：
 *   slotId, optIdx1, PREFIX1, level1, optIdx2, PREFIX2, level2, ...
 *
 * 三元组含义：
 *   optIdx（第1位）= enhance 的 option index，直接拼成 enhance_id 的后2位
 *                   enhance_id = slotId(7位) + optIdx(补零2位)
 *   PREFIX（第2位）= SYSTEM_EFFECT_PREFIX，显示/效果查找用（不参与 enhance_id 定位）
 *   level（第3位）= 强化等级
 *
 * 例："8020109,2,1132,5,1,1131,5,8,8890,1"
 *   → slot 8020109：
 *       (optIdx=2, PREFIX=1132, level=5) → enhance_id=802010902
 *       (optIdx=1, PREFIX=1131, level=5) → enhance_id=802010901
 *       (optIdx=8, PREFIX=8890, level=1) → enhance_id=802010908
 */

/** 单个科技模块（槽位内一个三元组） */
export interface TechModule {
  /** 槽位 ID（7位 = shipId(5) + slot(2)），对应 cfg_ship_system */
  slotId: string;
  /** enhance 的 option index（拼成 enhance_id 后2位） */
  optIdx: number;
  /** 科技 ID（= cfg_system_enhance 的 SYSTEM_EFFECT_PREFIX，效果查找用） */
  techId: number;
  /** 强化等级（1-5） */
  level: number;
  /** 推算的 enhance_id（= slotId + optIdx补零2位） */
  enhanceId: string;
}

/**
 * 解析科技串为模块列表。
 *
 * 输入首段是 slotId，其后每 3 个数字为一个 (optIdx, PREFIX, level) 三元组。
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
    // parts[1..] 按三元组（步长3）解析：(optIdx, PREFIX, level)
    for (let i = 1; i + 2 < parts.length + 1; i += 3) {
      const optIdx = Number(parts[i]);
      const techId = Number(parts[i + 1]);
      const level = Number(parts[i + 2]);
      // 任一非数字则跳过该三元组
      if (Number.isNaN(optIdx) || Number.isNaN(techId) || Number.isNaN(level)) continue;
      // enhance_id = slotId + optIdx补零2位
      const enhanceId = slotId + String(optIdx).padStart(2, '0');
      result.push({ slotId, optIdx, techId, level, enhanceId });
    }
  }
  return result;
}

/**
 * 把 enhance 等级映射 → 客户端科技串（levelsToTechStr，从 editor codec 下沉到 engine）。
 *
 * 格式: "slotId,optIdx,techId,level,optIdx,techId,level;slotId,..."
 * enhanceId(9位) = slotId(7) + optIdx(2)，techId = systemEnhance[enhanceId].SYSTEM_EFFECT_PREFIX。
 *
 * @param store 配置表（读 systemEnhance）
 * @param shipId 舰船 ID（当前未直接使用，保留参数与 editor codec 签名一致）
 * @param levels enhanceId → level 映射
 */
export function levelsToTechStr(
  store: { systemEnhance?: Record<string, Record<string, unknown>> },
  shipId: string,
  levels: Record<string, number>,
): string {
  void shipId;
  if (!store.systemEnhance) return "";
  const bySlot: Record<string, { optIdx: number; techId: number; level: number }[]> = {};
  for (const enhanceId in levels) {
    const lvl = levels[enhanceId];
    if (!lvl || lvl < 1) continue;
    const rec = store.systemEnhance[enhanceId];
    if (!rec) continue;
    const slotId = enhanceId.slice(0, 7);
    const optIdx = parseInt(enhanceId.slice(7, 9), 10);
    const techId = Number(rec.SYSTEM_EFFECT_PREFIX) || 0;
    if (!bySlot[slotId]) bySlot[slotId] = [];
    bySlot[slotId].push({ optIdx, techId, level: lvl });
  }
  const parts: string[] = [];
  for (const slotId in bySlot) {
    const triples = bySlot[slotId].map((t) => `${t.optIdx},${t.techId},${t.level}`).join(",");
    parts.push(`${slotId},${triples}`);
  }
  return parts.join(";");
}
