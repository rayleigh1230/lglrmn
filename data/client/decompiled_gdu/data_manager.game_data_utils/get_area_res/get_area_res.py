# Source Generated with Decompyle++
# File: get_area_res.pyc (Python 3.11)

plan_utils = plan_utils
import common
SceneManager = SceneManager
import common.scene_manager
cur_scene = SceneManager().try_get_strategy()
explore_mgr = cur_scene.explore_manager

def <dictcomp>(.0):
    pass
# WARNING: Decompyle incomplete

_res_dict = int(<dictcomp>, range(1, 4)())
_ids = set()
for g2_idx, radius in zip(g2_idxs, radiuses):
    for static_item_wid in STATIC_MAP_ITEM_INDEX.get_range_data_generator(plan_x_range[0], plan_x_range[1], plan_y_range[0], plan_y_range[1]):
        res_cfg = Tb_cfg_star.get(static_item_wid)
        if not res_cfg:
            continue
        res_coord = res_cfg[Tb_cfg_star.COORDINATE]
        res_g2 = map_utils.wid_with_coordinate_to_index_g2(static_item_wid, res_coord)
        res_radius = res_cfg[Tb_cfg_star.RADIUS] / 100
        if not explore_mgr.is_in_self_intelligence_view(res_g2) and explore_mgr.is_in_direct_view(res_g2, res_radius):
            continue
        if not plan_utils.is_in_plan(g2_idx, radius, target_type, res_g2, res_radius):
            continue
        if not res_cfg:
            continue
        if static_item_wid in _ids:
            continue
        _ids.add(static_item_wid)
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
