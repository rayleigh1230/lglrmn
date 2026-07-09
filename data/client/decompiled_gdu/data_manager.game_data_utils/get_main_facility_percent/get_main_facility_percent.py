# Source Generated with Decompyle++
# File: get_main_facility_percent.pyc (Python 3.11)

if is_sub_facility(facility_id):
    facility_id = sub_facility_id_to_main_facility_id(facility_id)
cur_level = get_facility_current_level(facility_id)
cfg_level = m0_utils.get_facility_level_cfg(facility_id, cur_level + 1)
need_level_list = []
need_num = 0
if cfg_level:
    condition_str = cfg_level[Tb_cfg_facility_level_ex.CONDITION_NEW]
    if condition_str:
        condition_dict = JsonUtil.loads(condition_str)
        if condition_dict and condition_dict.get('target_level_sum'):
            need_id = condition_dict['target_level_sum']['id']
            need_level_list = parse_cfg_str_to_list(need_id, is_num = True)
            need_num = condition_dict['target_level_sum']['level']
cur_sum = 0
if need_level_list:
    for cur_id in need_level_list:
        _cur_level = get_facility_current_level(cur_id)
        cur_sum += _cur_level
        return (cur_sum, need_num, need_level_list)
