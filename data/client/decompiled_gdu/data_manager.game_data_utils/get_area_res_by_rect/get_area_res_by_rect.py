# Source Generated with Decompyle++
# File: get_area_res_by_rect.pyc (Python 3.11)

SceneManager = SceneManager
import common.scene_manager
cur_scene = SceneManager().try_get_strategy()
explore_mgr = cur_scene.explore_manager
x_range = (g2_idx_left_bottom[0], g2_idx_left_bottom[0] + width)
y_range = (g2_idx_left_bottom[1], g2_idx_left_bottom[1] + height)

def <dictcomp>(.0):
    pass
# WARNING: Decompyle incomplete

_res_dict = int(<dictcomp>, range(1, 4)())
for static_item_wid in STATIC_MAP_ITEM_INDEX.get_range_data_generator(x_range[0], x_range[1], y_range[0], y_range[1]):
    index_g2 = map_utils.wid_to_index_g2(static_item_wid)
    if index_g2[0] >= x_range[1] and index_g2[0] <= x_range[0] and index_g2[1] <= y_range[0] or index_g2[1] >= y_range[1]:
        continue
    res_cfg = Tb_cfg_star.get(static_item_wid)
    if not res_cfg:
        continue
    res_radius = res_cfg[Tb_cfg_star.RADIUS] / 100
    if not explore_mgr.is_in_self_intelligence_view(index_g2) and explore_mgr.is_in_direct_view(index_g2, res_radius):
        continue
    cfg_orb = Tb_cfg_star.get_orb_template(res_cfg[Tb_cfg_star.TEMPLATE_ID])
    if not cfg_orb:
        continue
    max_num = get_orb_reserve(cfg_orb)
    if cfg_orb and cfg_orb[Tb_cfg_orb.IS_BORN_RES]:
        res_record = GameDataMgr().get_record(TableID.MAP_RES, static_item_wid, False)
        if not res_record or res_record.get(MapResField.INITED):
            continue
    total = 0
    change_dic = get_resid_to_mineid()
    res_dic = parse_cfg_str_to_dict_of_list(res_cfg[Tb_cfg_star.RES], True)
    for res_id, res_contain in six.iteritems(res_dic):
        total = total + res_contain
        if total > 0:
            for index in range(1, 4):
                res_id = change_dic[index]
                cfg_res_def = Tb_cfg_res_def.get(res_id)
                ratio = 0
                if cfg_res_def:
                    ratio = parse_cfg_str_to_list_of_list(cfg_res_def[Tb_cfg_res_def.BASIC_CONTAINS])[0][1]
                return _res_dict
