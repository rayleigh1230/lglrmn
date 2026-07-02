/**
 * editor 侧数据加载器
 * 读取 data/client/config/*.json + icons/manifest.json
 * 喂给 engine 的 createClientData()
 *
 * H5: 用 fetch 读静态资源 (config 复制到 dist/config)
 * 小程序: 用 Taro.request 或 require
 */
import { createClientData, type ClientDataStore, type ClientDataParts } from "@lagrange/engine";
import type { IconManifest } from "./iconResolver";

// 配置表文件名 → ClientDataParts key 的映射 (与 engine/tests/nodeUtils 一致)
const TABLE_FILES: Record<keyof ClientDataParts, string> = {
  ship: "cfg_ship.json",
  systemEffect: "cfg_system_effect.json",
  systemEnhance: "cfg_system_enhance.json",
  effectDef: "cfg_effect_def.json",
  weapon: "cfg_weapon.json",
  shipSlot: "cfg_ship_slot.json",
  shipSystem: "cfg_ship_system.json",
  shipType: "cfg_ship_type.json",
  shipBlueprint: "cfg_ship_blueprint.json",
  weaponAction: "cfg_weapon_action.json",
  weaponPriority: "cfg_weapon_priority.json",
  moduleEffect: "cfg_module_effect.json",
};

// 必需表 (缺失抛错)
const REQUIRED: (keyof ClientDataParts)[] = ["ship", "systemEffect", "systemEnhance", "effectDef"];

// 配置根路径: H5 下 config 复制到 dist/config; 开发时也可指向项目相对路径
const CONFIG_BASE = "config/";

let _store: ClientDataStore | null = null;
let _manifest: IconManifest | null = null;

/** H5/小程序通用的 JSON 读取 */
async function readJson(path: string): Promise<any> {
  // H5: fetch
  if (typeof fetch !== "undefined") {
    const resp = await fetch(path);
    if (!resp.ok) throw new Error(`读取失败 ${path}: ${resp.status}`);
    return resp.json();
  }
  // 小程序: Taro.request 不支持本地文件, 改用 require (需预先打包)
  // 简化: 此处假设 H5 优先
  throw new Error("无可用 JSON 读取方式");
}

/** 加载所有配置表, 返回 ClientDataStore */
export async function loadStore(): Promise<ClientDataStore> {
  if (_store) return _store;

  const parts: Partial<ClientDataParts> = {};
  const errors: string[] = [];

  for (const key of Object.keys(TABLE_FILES) as (keyof ClientDataParts)[]) {
    const file = TABLE_FILES[key];
    try {
      parts[key] = await readJson(CONFIG_BASE + file);
    } catch (e: any) {
      const msg = `${file}: ${e.message || e}`;
      if (REQUIRED.includes(key)) {
        errors.push(`[必需] ${msg}`);
      } else {
        errors.push(`[可选跳过] ${msg}`);
      }
    }
  }

  if (errors.some((m) => m.startsWith("[必需]"))) {
    throw new Error("必需配置表加载失败:\n" + errors.join("\n"));
  }
  if (errors.length) {
    console.warn("部分配置表跳过:", errors);
  }

  _store = createClientData(parts as ClientDataParts);
  console.log("[loadStore] 加载完成, ship表:", Object.keys(_store.ship).length, "条");
  return _store;
}

/** 加载图标 manifest */
export async function loadIconManifest(): Promise<IconManifest> {
  if (_manifest) return _manifest;
  try {
    _manifest = await readJson("icons/manifest.json");
  } catch (e) {
    console.warn("manifest 加载失败, 使用空 manifest:", e);
    _manifest = {
      version: 0,
      icon_count: 0,
      icons_dir: "",
      prefix_to_icon: {},
      enhance_id_to_icon: {},
      ship_type_to_icon: {},
      ship_class_icons: {},
      stat_icons: {},
      all_icons: [],
    };
  }
  return _manifest;
}

/** 预取: store + manifest 一起 */
export async function loadAll(): Promise<{ store: ClientDataStore; manifest: IconManifest }> {
  const [store, manifest] = await Promise.all([loadStore(), loadIconManifest()]);
  return { store, manifest };
}
