"""dump shipId -> 缩略图文件名映射, 存入 manifest"""
import sys, traceback, json, os
out = []
try:
    from ui.bp_ship_view_facade import blueprint_utils as bu
    import common.config.db as db

    ship_data = db.Tb_cfg_ship.get_all_data()
    ship_to_thumb = {}
    for sid in ship_data.keys():
        try:
            p = bu.get_ship_icon(sid, False, False)
            if p and isinstance(p, str):
                ship_to_thumb[str(sid)] = os.path.basename(p)
        except: pass

    out.append('映射条目数: ' + str(len(ship_to_thumb)))
    # 样本
    for sid in ['30101', '60301', '40501', '71101']:
        out.append('  ' + sid + ' -> ' + ship_to_thumb.get(sid, '?'))

    # 写入文件
    out_path = os.path.dirname(os.path.abspath(__file__)).replace(chr(92), '/') + '/../icons/ship_thumb_map.json'
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(ship_to_thumb, f, ensure_ascii=False)
    out.append('已写入: ' + out_path)

except Exception:
    out.append('TOPERR=' + traceback.format_exc()[:1500])
RESULT = json.dumps(out, ensure_ascii=False)
