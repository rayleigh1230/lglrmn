"""提取三类素材到 data/client/icons/ 子目录"""
import sys, traceback, json, os
out = []
saved = {'ship_thumb': 0, 'peak': 0, 'system_type': 0, 'ability': 0}
try:
    import nxio3
    from common import ui_res
    from ui.bp_ship_view_facade import blueprint_utils as bu
    import common.config.db as db

    ICONS_BASE = os.path.dirname(os.path.abspath(__file__)).replace(chr(92), '/') + '/../icons'
    def save_icon(res_path, subdir, filename):
        full = 'res:/' + res_path
        if not nxio3.exists(full):
            return False
        data = nxio3.load_file(full)
        if not data:
            return False
        dst_dir = ICONS_BASE + '/' + subdir
        os.makedirs(dst_dir, exist_ok=True)
        dst = dst_dir + '/' + filename
        if os.path.exists(dst):
            return True
        with open(dst, 'wb') as f:
            f.write(data)
        return True

    # 1. 舰船缩略图
    out.append('=== ship_thumb ===')
    ship_data = db.Tb_cfg_ship.get_all_data()
    ship_ids = list(ship_data.keys())
    out.append('ship count: ' + str(len(ship_ids)))
    for sid in ship_ids:
        try:
            p = bu.get_ship_icon(sid, False, False)
            if p and isinstance(p, str):
                fn = os.path.basename(p)
                if save_icon(p, 'ship_thumb', fn):
                    saved['ship_thumb'] += 1
        except: pass
    out.append('ship_thumb total: ' + str(saved['ship_thumb']))

    # 2. 巅峰徽章
    out.append('=== peak ===')
    peak_paths = {
        'peak_enhance': 'cocosui/_resource/icon/icon_interior_peakedness.png',
        'peak_reward_l': 'cocosui/_resource/icon/material_icon/icon_peak_l.png',
        'peak_reward_m': 'cocosui/_resource/icon/material_icon/icon_peak_m.png',
        'peak_bg': 'cocosui/_resource/icon/material_icon/icon_peakedness_bg_m.png',
        'peak_ship': 'cocosui/_resource/icon/material_icon/icon_peakedness_model_m.png',
        'peak_auth_l': 'cocosui/_resource/icon/material_icon/icon_adv_prop_l.png',
        'peak_auth_m': 'cocosui/_resource/icon/material_icon/icon_adv_prop_m.png',
        'peak_score': 'cocosui/_resource/icon/material_icon/icon_military_prestige_l.png',
        'peak_enhance_type': 'cocosui/_resource/texture/ship_enhance/icon_enhance_type_3.png',
        'peak_quest': 'cocosui/_resource/icon/quest_level/img_quest_peakedness.png',
    }
    for name, path in peak_paths.items():
        fn = os.path.basename(path)
        if save_icon(path, 'peak', fn):
            saved['peak'] += 1
            out.append('  ok ' + name + ' -> ' + fn)
        else:
            out.append('  miss ' + name)
    for i in range(1, 6):
        p = 'cocosui/_resource/common/peakedness_deco/adv_authentication_mainpage/result_icon/result_' + str(i) + '.png'
        if save_icon(p, 'peak', 'peak_result_' + str(i) + '.png'):
            saved['peak'] += 1
            out.append('  ok peak_result_' + str(i))

    # 3. 系统类型图标
    out.append('=== system_type ===')
    sys_type_paths = {
        'weapon_system': 'cocosui/_resource/icon/icon_bp_weaponsystem.png',
        'module_weapon_00': 'cocosui/_resource/icon/icon_module_weapon_00.png',
        'sys_bg_attack': 'cocosui/_resource/texture/ship_enhance/img_system_bg_1.png',
        'sys_bg_noattack': 'cocosui/_resource/texture/ship_enhance/img_system_bg_2.png',
    }
    for name, path in sys_type_paths.items():
        fn = os.path.basename(path)
        if save_icon(path, 'system_type', fn):
            saved['system_type'] += 1
            out.append('  ok ' + name + ' -> ' + fn)
    sys_type_names = ['fire', 'missile', 'torpedo', 'armor', 'power', 'energy', 'command', 'aircraft',
                      'drone', 'railgun', 'cannon', 'ion', 'shield', 'repair', '0', '1', '2', '3', '4', '5']
    for name in sys_type_names:
        for fmt in ['icon_ship_system_{}.png', 'icon_system_{}.png', 'icon_module_{}.png']:
            p = 'cocosui/_resource/icon/' + fmt.format(name)
            if nxio3.exists('res:/' + p):
                fn = os.path.basename(p)
                if save_icon(p, 'system_type', fn):
                    saved['system_type'] += 1
                    out.append('  ok ' + fn)
                break

    # 4. 能力图标
    out.append('=== ability ===')
    if hasattr(bu, 'SHIP_ABILITY_ICON'):
        sai = bu.SHIP_ABILITY_ICON
        if isinstance(sai, (list, tuple)):
            for i, path in enumerate(sai):
                if isinstance(path, str) and path:
                    fn = os.path.basename(path) or ('ability_' + str(i) + '.png')
                    if save_icon(path, 'ability', fn):
                        saved['ability'] += 1
            out.append('  ability: ' + str(saved['ability']))

    out.append('=== done ===')
    out.append('stats: ' + json.dumps(saved, ensure_ascii=False))

except Exception:
    out.append('TOPERR=' + traceback.format_exc()[:2000])
RESULT = json.dumps(out, ensure_ascii=False)
