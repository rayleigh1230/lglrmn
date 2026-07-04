"""提取公司徽章图标 + dump shipId→company映射

输出:
  data/client/icons/company/icon_type_XX.png  (90个公司徽章)
  data/client/icons/company_map.json          (shipId → {companyId, iconFile})
"""
import sys, traceback, json, os
out = []
saved = {'icon': 0, 'map': 0}
try:
    import nxio3
    from common import ui_res
    import common.config.db as db

    ICONS_BASE = os.path.dirname(os.path.abspath(__file__)).replace(chr(92), '/') + '/../icons'
    COMPANY_DIR = ICONS_BASE + '/company'
    os.makedirs(COMPANY_DIR, exist_ok=True)

    def save_icon(res_path):
        """从 res:/ 路径提取图标到 company/ 目录, 返回文件名或 None"""
        full = 'res:/' + res_path.lstrip('/')
        if not nxio3.exists(full):
            return None
        data = nxio3.load_file(full)
        if not data:
            return None
        fn = os.path.basename(res_path)
        dst = COMPANY_DIR + '/' + fn
        if not os.path.exists(dst):
            with open(dst, 'wb') as f:
                f.write(data)
        return fn

    # ===== 1. 提取公司徽章图标 =====
    out.append('=== 提取公司徽章 ===')
    # icon_type_01.png ~ icon_type_84.png
    for i in range(1, 85):
        p = 'cocosui/_resource/buleprint_company_icon/icon_type_' + str(i).zfill(2) + '.png'
        fn = save_icon(p)
        if fn:
            saved['icon'] += 1
    # 6 个具名图标
    named = [
        'icon_arbitration_commission.png',
        'icon_common.png',
        'icon_dinosaur_cruise.png',
        'icon_freedom.png',
        'icon_old_empire.png',
        'icon_pirate.png',
    ]
    for nm in named:
        p = 'cocosui/_resource/buleprint_company_icon/' + nm
        fn = save_icon(p)
        if fn:
            saved['icon'] += 1
    out.append('公司徽章提取: ' + str(saved['icon']) + ' 个')

    # ===== 2. dump shipId → company 映射 =====
    out.append('=== dump shipId→company 映射 ===')
    # 尝试导入 ShipAttribute
    try:
        from data.ship.ship_attribute import ShipAttribute
    except Exception:
        # 备用路径
        try:
            from data.ship import ship_attribute as _samod
            ShipAttribute = _samod.ShipAttribute
        except Exception as e:
            out.append('ShipAttribute import 失败: ' + str(e)[:200])
            ShipAttribute = None

    ship_data = db.Tb_cfg_ship.get_all_data()
    out.append('舰船总数: ' + str(len(ship_data)))

    company_map = {}
    if ShipAttribute is not None:
        # 优先用缓存的 ATTRIBUTE_DICT
        attr_dict = getattr(ShipAttribute, 'ATTRIBUTE_DICT', {})
        out.append('ATTRIBUTE_DICT 缓存数: ' + str(len(attr_dict)))

        for sid in ship_data.keys():
            try:
                attr = attr_dict.get(sid)
                if attr is None:
                    # 缓存没有, 手动实例化
                    cfg = ship_data[sid]
                    attr = ShipAttribute(sid, cfg)
                company_id = getattr(attr, 'company_id', None)
                company_icon = getattr(attr, 'company_icon', None)
                if company_id is not None:
                    icon_file = None
                    if company_icon and isinstance(company_icon, str):
                        # company_icon 可能是 res:/ 路径或相对路径
                        icon_file = os.path.basename(company_icon)
                        # 确保图标已提取
                        rel = company_icon.replace('res:/', '').lstrip('/')
                        if not os.path.exists(COMPANY_DIR + '/' + icon_file):
                            save_icon(rel)
                    company_map[str(sid)] = {
                        'companyId': company_id,
                        'iconFile': icon_file,
                    }
                    saved['map'] += 1
            except Exception:
                pass

    out.append('映射条目数: ' + str(saved['map']))
    # 样本
    for sid in ['60301', '60201', '80201', '10201', '30101']:
        if sid in company_map:
            out.append('  ' + sid + ' -> ' + json.dumps(company_map[sid], ensure_ascii=False))

    # 写入映射文件
    map_path = ICONS_BASE + '/company_map.json'
    with open(map_path, 'w', encoding='utf-8') as f:
        json.dump(company_map, f, ensure_ascii=False)
    out.append('映射已写入: ' + map_path)

    out.append('=== done ===')
    out.append('stats: ' + json.dumps(saved, ensure_ascii=False))

except Exception:
    out.append('TOPERR=' + traceback.format_exc()[:2500])
RESULT = json.dumps(out, ensure_ascii=False)
