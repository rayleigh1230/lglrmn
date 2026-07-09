# Source Generated with Decompyle++
# File: get_building_facility_max_num_limit.pyc (Python 3.11)

max_num = 0
for key, config in list(Tb_cfg_facility_level_ex.get_all_data().items()):
    effects = config[Tb_cfg_facility_level_ex.IMMEDIATE_EFFECTS]
    if not effects:
        continue
    immediate_effects = parse_cfg_str_to_list_of_list(effects, True, is_cache = True)
    for idx, item in enumerate(immediate_effects):
        if item[0] == effect_id and item[1] == item_id:
            max_num = max(max_num, item[2])
    return max_num
