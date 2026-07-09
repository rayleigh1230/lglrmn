# Source Generated with Decompyle++
# File: get_cur_can_strengthen_sub_facility_list.pyc (Python 3.11)

game_data_mgr = GameDataMgr()
facility_table = game_data_mgr.get_table(TableID.FACILITY)
building_id_u = get_player_base_building_id()
facility_id_us = game_data_mgr.get_sub_key_data(TableID.FACILITY, FacilityField.BELONG_ID, building_id_u)
extend_point = { }
base_level_regions = m0_utils.base_level_size()
for facility_id_u in facility_id_us:
    facility_record = facility_table.get(facility_id_u)
    if not facility_record:
        continue
    facility_id = facility_record[FacilityField.FACILITY_ID]
    if is_sub_facility(facility_id):
        continue
    if is_fully_updated(facility_id):
        continue
    if facility_id in base_level_regions:
        continue
    cur_level = get_facility_current_level(facility_id)
    max_level = Tb_cfg_facility.get(facility_id)[Tb_cfg_facility.LEVEL_MAX]
    if cur_level != max_level:
        cached = FACILITY_LEVEL_CONDITION_NEW_CACHE.get((facility_id, cur_level + 1))
        if cached:
            for key in cached['need_id_list']:
                if is_sub_facility(key) and sub_facility_id_to_main_facility_id(key) == facility_id:
                    sub_cur_level = get_facility_current_level(key)
                    sub_max_level = Tb_cfg_facility.get(key)[Tb_cfg_facility.LEVEL_MAX]
                    if sub_cur_level != sub_max_level:
                        extend_point[facility_id] = key
                    
                    continue
                    for node_id in FACILITY_ENHANCE_TREE_BY_MAIN_CACHE.get(facility_id, ()):
                        node_cur_level = get_facility_current_level(node_id)
                        node_max_level = Tb_cfg_facility.get(node_id)[Tb_cfg_facility.LEVEL_MAX]
                        if node_cur_level < node_max_level:
                            extend_point[facility_id] = node_id
                        result_list = []
                        for facility_id, sub_facility_id in six.iteritems(extend_point):
                            level = get_facility_current_level(sub_facility_id)
                            next_level_cfg = m0_utils.get_facility_level_cfg(sub_facility_id, level + 1)
                            if next_level_cfg:
                                cost_str = next_level_cfg[Tb_cfg_facility_level_ex.RES_COST]
                                cost_dict = get_facility_upgrade_res_cost(cost_str, sub_facility_id)
                                result = 0
                                for key, value in six.iteritems(cost_dict):
                                    cfg = Tb_cfg_res_def.get(key)
                                    if cfg[Tb_cfg_res_def.CAPACITY_RATIO] > 0:
                                        result += value * cfg[Tb_cfg_res_def.CAPACITY_RATIO]
                                    result_list.append((facility_id, sub_facility_id, result))
                                    result_list.sort(key = (lambda x: x[2]))
                                    return result_list
