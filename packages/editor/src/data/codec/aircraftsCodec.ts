/**
 * 舰载机 codec（对齐客户端 ShipField.AIRCRAFTS）
 *
 * 模拟器内部用结构化对象（aircrafts: Record<shipId, number[]>），
 * 跨边界（导入真实存档 / 导出给客户端用）走客户端字符串格式：
 *
 *   客户端 ShipField.AIRCRAFTS = parse_cfg_str_to_dict_of_list 的输入串
 *   格式: "shipId,count1,count2,...;shipId,count1,..."
 *   解析后: { shipId: [count1, count2, ...], ... }
 *
 * 与 enhanceCodec 同层（见 codec/index.ts）。
 */

/** 舰载机搭载状态：shipId → 各槽数量列表 */
export type AircraftsState = Record<string, number[]>;

/**
 * 把结构化 aircrafts → 客户端 AIRCRAFTS 字符串。
 * 格式: "shipId,c1,c2;shipId,c1"（空对象返回空串）。
 */
export function aircraftsToStr(aircrafts: AircraftsState): string {
  const parts: string[] = [];
  for (const shipId in aircrafts) {
    const counts = aircrafts[shipId];
    if (!Array.isArray(counts) || counts.length === 0) continue;
    parts.push([shipId, ...counts.map(Number)].join(","));
  }
  return parts.join(";");
}

/**
 * 把客户端 AIRCRAFTS 字符串 → 结构化 aircrafts。
 * 对齐客户端 parse_cfg_str_to_dict_of_list(aircraft_type_limit_str, is_num=True)。
 * 容错：空串/无效格式返回 {}。
 */
export function strToAircrafts(str: string | undefined | null): AircraftsState {
  const out: AircraftsState = {};
  if (!str || typeof str !== "string") return out;
  const trimmed = str.trim();
  if (!trimmed) return out;
  for (const segment of trimmed.split(";")) {
    const parts = segment.split(",");
    if (parts.length < 2) continue;
    const shipId = parts[0];
    if (!shipId) continue;
    const counts = parts.slice(1).map(p => Number(p)).filter(n => !Number.isNaN(n));
    if (counts.length === 0) continue;
    out[shipId] = counts;
  }
  return out;
}
