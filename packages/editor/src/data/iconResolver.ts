/**
 * 图标解析器: 逻辑名 → 图标URL
 *
 * 图标分类:
 * 1. 强化节点图标: enhance_id / PREFIX → system_intensify_new 目录
 * 2. 舰船缩略图: shipId → ship_thumb_map.json 映射 → ship_thumb/ 目录 (2D侧视图)
 * 3. 舰种图标: category → ship_class_icons (护卫/驱逐等剪影)
 * 4. 属性图标: stat_icons (hit/dodge/crit等)
 * 5. 巅峰图标: peak/ 目录 (巅峰徽章/背景)
 * 6. 能力图标: ability/ 目录 (火力/防空/攻城等)
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

/** 舰船ID → 2D缩略图文件名映射 (来自 ship_thumb_map.json) */
let _shipThumbMap: Record<string, string> = {};

/** 舰船ID → 公司徽章映射 (来自 company_map.json, frida dump) */
interface CompanyEntry { companyId: number; iconFile: string | null }
let _companyMap: Record<string, CompanyEntry> = {};

let _manifest: IconManifest | null = null;

export function setManifest(m: IconManifest): void {
  _manifest = m;
}

/** 设置舰船缩略图映射 (从 ship_thumb_map.json 加载) */
export function setShipThumbMap(map: Record<string, string>): void {
  _shipThumbMap = map;
}

/** 设置公司徽章映射 (从 company_map.json 加载) */
export function setCompanyMap(map: Record<string, CompanyEntry>): void {
  _companyMap = map;
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

/**
 * ★舰船2D缩略图: shipId → ship_thumb/ 文件
 * 来自游戏 get_ship_icon(shipId)，命名如 s_frigate_m_001_1.png
 * 无映射时回退到舰种图标。
 */
export function shipThumbnailIcon(shipId: string): string {
  const fn = _shipThumbMap[shipId];
  if (fn) return ICON_BASE + "ship_thumb/" + fn;
  return "";
}

/**
 * ★舰船Wiki图(B站wiki高质量正面图): shipId → ship_wiki/ship_XXXXX.jpg
 * 优先用wiki图(正面/3D视角), 无则返回空回退到缩略图
 */
export function shipWikiIcon(shipId: string): string {
  return ICON_BASE + "ship_wiki/ship_" + shipId + ".jpg";
}

/** 舰种图标(剪影): 按 category 匹配 */
export function shipClassIcon(category: string): string {
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
  if (hasIcon("icon_ship_type_unknown.png")) return iconUrl("icon_ship_type_unknown.png");
  return "";
}

/** 巅峰图标 */
export function peakIcon(name: string): string {
  return ICON_BASE + "peak/" + name;
}

/**
 * ★公司徽章图标: shipId → company/icon_type_XX.png
 * 来自游戏 ShipAttribute.company_icon (frida dump)，每个公司的菱形徽章
 */
export function companyIcon(shipId: string): string {
  const entry = _companyMap[shipId];
  if (entry?.iconFile) return ICON_BASE + "company/" + entry.iconFile;
  return "";
}

/** 能力图标(火力/防空/攻城/支援/战略) */
export function abilityIcon(name: string): string {
  return ICON_BASE + "ability/" + name;
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
