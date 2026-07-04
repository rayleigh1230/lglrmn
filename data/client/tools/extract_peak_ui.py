"""提取巅峰等级UI素材: ADV底图/公司背景/等级数字"""
import sys, traceback, json, os
out = []
saved = 0
try:
    import nxio3
    ICONS_BASE = os.path.dirname(os.path.abspath(__file__)).replace(chr(92), '/') + '/../icons'
    PEAK_DIR = ICONS_BASE + '/peak'
    os.makedirs(PEAK_DIR, exist_ok=True)

    def save_icon(res_path):
        full = 'res:/' + res_path.lstrip('/')
        if not nxio3.exists(full):
            return False
        data = nxio3.load_file(full)
        if not data:
            return False
        fn = os.path.basename(res_path)
        dst = PEAK_DIR + '/' + fn
        with open(dst, 'wb') as f:
            f.write(data)
        return True

    # 关键素材
    targets = [
        # ADV底图 (蓝图LOGO背景的ADV版)
        'cocosui/_resource/common/peakedness_deco/version/img_blueprint_logo_bg_adv.png',
        'cocosui/_resource/common/peakedness_deco/version/img_blueprint_logo_bg_1.png',
        'cocosui/_resource/common/peakedness_deco/version/img_blueprint_logo_bg_2.png',
        # 公司徽章背景
        'cocosui/_resource/texture/peakedness/img_peakedness_company_bg_s.png',
    ]
    for p in targets:
        if save_icon(p):
            saved += 1
            out.append('ok: ' + os.path.basename(p))
        else:
            out.append('miss: ' + p)

    # 等级数字图标 icon_peak_1.png ~ icon_peak_20.png
    out.append('=== 等级数字 ===')
    for i in range(1, 25):
        for d in ['material_icon', 'common/peakedness_deco']:
            for pat in ['icon_peak_{}.png', 'icon_peak_lv_{}.png', 'peak_lv_{}.png', 'img_peak_lv_{}.png']:
                p = 'cocosui/_resource/' + d + '/' + pat.format(i)
                if save_icon(p):
                    saved += 1
                    out.append('  ok lv' + str(i) + ': ' + p)
                    break

    # 探测: 搜 material_icon 目录里所有 peak 相关
    out.append('=== 探测 material_icon 里 peak 相关 ===')
    import glob

    out.append('saved total: ' + str(saved))
except Exception:
    out.append('TOPERR=' + traceback.format_exc()[:2000])
RESULT = json.dumps(out, ensure_ascii=False)
