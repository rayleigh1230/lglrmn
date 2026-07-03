"""
阶段0.3: 生成图标 manifest.json
把 data/client/icons/*.png 映射成 {逻辑名: 文件名}, 供UI查询。
同时从cfg_system_effect建立 EFFECT_PREFIX → 图标 的映射。
"""
import json, os

ICONS_DIR = r"F:\战斗模拟器\lglrmn\data\client\icons"
CONFIG_DIR = r"F:\战斗模拟器\lglrmn\data\client\config"
MANIFEST_PATH = os.path.join(ICONS_DIR, "manifest.json")


def build_manifest():
    # 1. 列出所有已提取的png
    extracted = set(f for f in os.listdir(ICONS_DIR) if f.endswith('.png'))
    print(f"已提取图标: {len(extracted)} 个")

    # 2. 从 cfg_system_effect 建立 PREFIX → PATH → 文件名 映射
    effect = json.load(open(os.path.join(CONFIG_DIR, 'cfg_system_effect.json'), encoding='utf-8'))
    enhance = json.load(open(os.path.join(CONFIG_DIR, 'cfg_system_enhance.json'), encoding='utf-8'))

    # PREFIX → 图标文件名 (PREFIX+"01" → effect.PATH)
    prefix_to_icon = {}
    for enh_id, rec in enhance.items():
        prefix = rec.get('SYSTEM_EFFECT_PREFIX')
        if prefix is None:
            continue
        key = f"{prefix}01"
        eff = effect.get(key)
        if eff and eff.get('PATH'):
            icon_fn = os.path.basename(eff['PATH'])
            prefix_to_icon[str(prefix)] = {
                'icon': icon_fn,
                'available': icon_fn in extracted,
                'effect_name': eff.get('NAME', ''),
            }

    # 3. enhance_id → 图标 (enhance_id 的最后2位=optIdx, 前7位=slotId)
    #    PREFIX从 enhance rec 取, 同一slotId的所有optIdx共享PREFIX→icon
    enhance_id_to_icon = {}
    for enh_id, rec in enhance.items():
        prefix = rec.get('SYSTEM_EFFECT_PREFIX')
        if prefix is None:
            continue
        info = prefix_to_icon.get(str(prefix))
        if info:
            enhance_id_to_icon[enh_id] = info['icon']

    # 4. 舰船 → 舰种图标回退
    # cfg_ship[3]=ship_type, cfg_ship_type 有舰种分类
    # 舰种→通用图标 映射 (基于icon_production_shiptype_*)
    ship_type_to_icon = {
        # ship_type id (cfg_ship[3]) → 通用图标
        # 护卫/驱逐/巡洋/战巡/战列/航母/支援/工程 → 对应production图标
        # 精确映射待cfg_ship_type确认, 这里先粗分
        'frigate': 'icon_production_shiptype_engineering.png',     # 护卫(小型)
        'destroyer': 'icon_production_shiptype_engineering.png',   # 驱逐(小型)
        'cruiser': 'icon_production_shiptype_mainship.png',        # 巡洋(主力)
        'battlecruiser': 'icon_production_shiptype_mainship.png',  # 战巡(主力)
        'battleship': 'icon_production_shiptype_mainship.png',     # 战列(主力)
        'carrier': 'icon_production_shiptype_carrier.png',         # 航母(载机)
        'support': 'icon_production_shiptype_engineering.png',     # 支援(工程)
        'fighter': 'icon_ship_airplane.png',                       # 战机
    }

    # 5. 属性图标 (hit/dodge/crit/cool 等)
    stat_icons = {
        'structure': 'icon_storage.png',
        'hit': None,  # 待补
        'dodge': 'icon_ship_dodge.png',
        'crit': None,
        'cooldown': None,
        'damage': 'icon_firepower_antiship.png',
        'antiair': 'icon_firepower_airdefense.png',
        'siege': 'icon_firepower_siege.png',
        'repair': 'icon_repair.png',
        'speed': None,
    }

    # 6. 舰种通用图标 (列表里所有ship相关)
    ship_class_icons = {
        'big': 'icon_ship_big.png',
        'medium': 'icon_ship_medium_sized.png',
        'small': 'icon_ship_small.png',
        'airplane': 'icon_ship_airplane.png',
        'carrier': 'icon_production_shiptype_carrier.png',
        'mainship': 'icon_production_shiptype_mainship.png',
        'engineering': 'icon_production_shiptype_engineering.png',
        'super': 'icon_production_shiptype_super.png',
        'flagship': 'icon_flagship.png',
    }

    manifest = {
        'version': 1,
        'icon_count': len(extracted),
        'icons_dir': 'data/client/icons',
        'prefix_to_icon': prefix_to_icon,
        'enhance_id_to_icon': enhance_id_to_icon,
        'ship_type_to_icon': ship_type_to_icon,
        'ship_class_icons': ship_class_icons,
        'stat_icons': stat_icons,
        'all_icons': sorted(extracted),
    }

    with open(MANIFEST_PATH, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"manifest 已生成: {MANIFEST_PATH}")
    print(f"  PREFIX→图标 映射: {len(prefix_to_icon)} 条")
    print(f"  其中可用(extracted): {sum(1 for v in prefix_to_icon.values() if v['available'])}")
    print(f"  enhance_id→图标: {len(enhance_id_to_icon)} 条")
    print(f"  缺失图标PREFIX: {sum(1 for v in prefix_to_icon.values() if not v['available'])}")

    # 输出缺失的图标清单
    missing = [(k, v['icon'], v['effect_name']) for k, v in prefix_to_icon.items() if not v['available']]
    if missing:
        print(f"  缺失样例(前10):")
        for pfx, fn, name in missing[:10]:
            print(f"    PREFIX {pfx} → {fn} ({name})")


if __name__ == "__main__":
    build_manifest()
