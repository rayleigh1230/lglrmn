# Source Generated with Decompyle++
# File: get_sub_facility_level_dict.pyc (Python 3.11)

if is_sub_facility(facility_id):
    facility_id = sub_facility_id_to_main_facility_id(facility_id)
ret = { }
for new_id, cfg in six.iteritems(Tb_cfg_facility_level_ex.get_all_data()):
    sub_facility_id = cfg[Tb_cfg_facility_level_ex.FACILITY_ID]
    level = cfg[Tb_cfg_facility_level_ex.LEVEL]
    if level != 1:
        continue
    if sub_facility_id_to_main_facility_id(sub_facility_id) != facility_id:
        continue
    condition_str = cfg[Tb_cfg_facility_level_ex.CONDITION_NEW]
    if condition_str:
        condition_json = JsonUtil.loads(condition_str)
        if condition_json:
            target_facility_str = condition_json.get('target_facility')
            if target_facility_str:
                target_facility = parse_cfg_str_to_dict_of_list(target_facility_str, is_num = True)
                if target_facility:
                    need_level = max(target_facility.values())
                    if need_level not in ret:
                        ret[need_level] = []
                    ret[need_level].append(sub_facility_id)
    return ret
