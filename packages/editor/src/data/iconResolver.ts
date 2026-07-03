/**
 * 图标解析器: 逻辑名 → 图标URL
 *
 * 三类图标:
 * 1. 强化节点图标: enhance_id → manifest.enhance_id_to_icon[enhanceId]
 * 2. 舰船缩略图: 舰种 → ship_class_icons 回退 (游戏是3D渲染,无静态PNG)
 * 3. 属性图标: stat_icons (hit/dodge/crit等)
 */
export interface IconManifest {
  version: number;
  icon_count: number;
  icons_dir: string;
  prefix_to_icon: Record<string, { icon: string; available: boolean; effect_name: string }>;
  enhance_id_to_icon: Record<string, string>;
  ship_type_to_icon: Record<string, string>;
  ship_class_icons: Record<string, string>;
  stat_icons: Record<string, string | null>;
  all_icons: string[];
}

let _manifest: IconManifest | null = null;

export function setManifest(m: IconManifest): void {
  _manifest = m;
}

const ICON_BASE = "icons/";

/** 取图标URL (文件名 → 完整路径) */
export function iconUrl(filename: string | null | undefined): string {
  if (!filename) return "";
  return ICON_BASE + filename;
}

/** 通过 enhance_id (9位) 取强化图标 */
export function enhanceIcon(enhanceId: string): string {
  const fn = _manifest?.enhance_id_to_icon?.[enhanceId];
  return fn ? iconUrl(fn) : "";
}

/** 通过 SYSTEM_EFFECT_PREFIX 取强化图标 */
export function prefixIcon(prefix: number | string): string {
  const info = _manifest?.prefix_to_icon?.[String(prefix)];
  return info?.available ? iconUrl(info.icon) : "";
}

/** 舰船缩略图: 按 category 匹配舰种图标 */
export function shipThumbnailIcon(category: string): string {
  const categoryIconMap: Record<string, string> = {
    frigate: "icon_ship_type_frigate.png",
    destroyer: "icon_ship_type_destroyer.png",
    cruiser: "icon_ship_type_cruiser.png",
    battlecruiser: "icon_ship_type_battle_cruiser.png",
    battleship: "icon_ship_type_battle_ship.png",
    carrier: "icon_ship_type_carrier.png",
    support: "icon_ship_type_support_ship.png",
    fighter: "icon_ship_type_fighter.png",
    escort: "icon_ship_type_boat.png",
  };
  const icon = categoryIconMap[category];
  if (icon && hasIcon(icon)) return iconUrl(icon);
  // 兜底
  if (hasIcon("icon_ship_type_unknown.png")) return iconUrl("icon_ship_type_unknown.png");
  return "";
}

/** 属性图标 */
export function statIcon(statKey: string): string {
  const fn = _manifest?.stat_icons?.[statKey];
  return fn ? iconUrl(fn) : "";
}

/** 检查图标是否存在 */
export function hasIcon(filename: string): boolean {
  return _manifest?.all_icons?.includes(filename) ?? false;
}
