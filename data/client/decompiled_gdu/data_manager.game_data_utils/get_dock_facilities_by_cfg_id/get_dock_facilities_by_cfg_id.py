# Source Generated with Decompyle++
# File: get_dock_facilities_by_cfg_id.pyc (Python 3.11)

extra_facility = { }
level_facility = { }
cfg_record = Tb_cfg_world_item.get(cfg_id)
if cfg_record:
    extra_facility = parse_cfg_str_to_dict_of_list(cfg_record[Tb_cfg_world_item.DOCK_FACILITIES], True)
    level_facility = parse_cfg_str_to_dict_of_list(cfg_record[Tb_cfg_world_item.DOCK_INIT_FACILITIES_NEW], True)
final_dic = { }
for k, v in six.iteritems(extra_facility):
    facility_id = v[0] if isinstance(v, list) else v
    if m0_utils.is_invalid_facility(k):
        continue
    v_level = level_facility.get(facility_id)
    new_id = m0_utils.get_facility_level_key(facility_id, v_level)
    if not new_id:
        continue
    final_dic[k] = new_id
    return final_dic
