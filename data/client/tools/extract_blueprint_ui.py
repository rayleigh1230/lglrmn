"""提取蓝图设计界面全套UI图标素材

输出到 data/client/icons/ 各子目录:
  - ui/         : 技术值/型号/面板框架等通用UI
  - system_type/: 系统类型图标(装甲/动力/工程/机库/战斗/指挥/子系统)
  - peak/       : 强化类型/调校槽(补充)
"""
import sys, traceback, json, os
out = []
saved = {'ui': 0, 'system_type': 0, 'peak': 0}
try:
    import nxio3

    ICONS_BASE = os.path.dirname(os.path.abspath(__file__)).replace(chr(92), '/') + '/../icons'
    UI_DIR = ICONS_BASE + '/ui'
    SYS_DIR = ICONS_BASE + '/system_type'
    PEAK_DIR = ICONS_BASE + '/peak'
    for d in [UI_DIR, SYS_DIR, PEAK_DIR]:
        os.makedirs(d, exist_ok=True)

    def save(res_path, subdir):
        full = 'res:/' + res_path.lstrip('/')
        if not nxio3.exists(full):
            return False
        data = nxio3.load_file(full)
        if not data:
            return False
        fn = os.path.basename(res_path)
        dst = ICONS_BASE + '/' + subdir + '/' + fn
        if not os.path.exists(dst):
            with open(dst, 'wb') as f:
                f.write(data)
        saved[subdir] = saved.get(subdir, 0) + 1
        return True

    R = 'cocosui/_resource/'

    # ===== 1. 技术值图标 =====
    out.append('=== 技术值 ===')
    for p in [
        R + 'icon/material_icon/icon_techpoints_m.png',
        R + 'icon/material_icon/icon_techpoints_l.png',
        R + 'icon/material_icon/icon_techpoints_equip_m.png',
        R + 'icon/material_icon/icon_eternal_techpoints_m.png',
        R + 'icon/icon_common_techpoint_l2.png',
    ]:
        if save(p, 'ui'):
            out.append('  ok ' + os.path.basename(p))

    # ===== 2. 蓝图型号/版本 =====
    out.append('=== 型号/版本 ===')
    for p in [
        R + 'icon/icon_bp_models_lock_write.png',
        R + 'common/img_blueprint_main_version_deco_shlash.png',
        R + 'common/img_blueprint_stats_bg1.png',
        R + 'common/img_blueprint_intensify_system.png',
        R + 'common/img_blueprint_system_enhance_empty.png',
        R + 'common/img_blueprint_tech_detail_node_twill.png',
        R + 'common/blueprint_system_card_deco.png',
        R + 'common/blueprint_system_card_choose_line.png',
        R + 'common/bg_blueprint_module_info_deco.png',
    ]:
        if save(p, 'ui'):
            out.append('  ok ' + os.path.basename(p))

    # ===== 3. 系统类型图标(全量) =====
    out.append('=== 系统类型 ===')
    ship_sys_dir = R + 'icon/icon_ship_system/'
    for nm in ['icon_system_armor.png', 'icon_system_dynamic.png', 'icon_system_engineering.png',
               'icon_system_hangar.png', 'icon_system_type_battle.png', 'icon_system_type_command.png',
               'icon_system_type_subsystem.png']:
        if save(ship_sys_dir + nm, 'system_type'):
            out.append('  ok ' + nm)
    # 系统强化默认图标
    if save(R + 'icon/icon_system_enhancement_skill_default.png', 'system_type'):
        out.append('  ok icon_system_enhancement_skill_default.png')
    if save(R + 'icon/icon_systemenhance_none.png', 'system_type'):
        out.append('  ok icon_systemenhance_none.png')

    # ===== 4. 强化类型 + 调校槽 =====
    out.append('=== 强化/调校 ===')
    se = R + 'texture/ship_enhance/'
    for nm in [
        'icon_enhance_type_1.png', 'icon_enhance_type_2.png', 'icon_enhance_type_3.png',
        'icon_adjust_type_1.png', 'icon_adjust_lock.png',
        'bg_hexagon_can_adjust.png', 'bg_hexagon_frame.png', 'bg_hexagon_bottom.png',
        'img_hexagon_adjust.png', 'bg_adjust_lv_01.png',
        'img_system_bg_1.png', 'img_system_bg_2.png',
        'icon_flagship.png', 'icon_link.png', 'bg_sys_list.png',
    ]:
        if save(se + nm, 'peak'):
            out.append('  ok ' + nm)

    # ===== 5. 强化按钮 =====
    out.append('=== 按钮 ===')
    btn = R + 'button/'
    for nm in [
        'btn_blueprint_intensify_nml.png', 'btn_blueprint_intensify_prs.png',
        'btn_blueprint_modification.png', 'btn_blueprint_cut_sel.png',
        'btn_blueprint_maineffect_change_sel.png',
    ]:
        if save(btn + nm, 'ui'):
            out.append('  ok ' + nm)

    out.append('=== done ===')
    out.append('stats: ' + json.dumps(saved, ensure_ascii=False))

except Exception:
    out.append('TOPERR=' + traceback.format_exc()[:2500])
RESULT = json.dumps(out, ensure_ascii=False)
