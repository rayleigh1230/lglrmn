# Source Generated with Decompyle++
# File: get_upgrade_base_size_lack_facility_dict_new.pyc (Python 3.11)

upgrade_facility_dict = { }
for facility_id in (CfgFacilityField.Fid.FID_GANG_QU_SIZE, CfgFacilityField.Fid.FID_CENTER_AREA_SIZE, CfgFacilityField.Fid.FID_INDUSTRIAL_AREA_SIZE):
    cur_level = get_facility_level(facility_id)
    facility_cfg = Tb_cfg_facility.get(facility_id)
    max_level = facility_cfg[Tb_cfg_facility.LEVEL_MAX]
    if cur_level >= max_level:
        continue
    next_level_cfg = m0_utils.get_facility_level_cfg(facility_id, cur_level + 1)
    if not next_level_cfg:
        continue
    level_condition_json = next_level_cfg[Tb_cfg_facility_level_ex.CONDITION_NEW]
    level_condition_dict = { }
    if level_condition_json:
        cur_dict = JsonUtil.loads(level_condition_json)
        cur_str = cur_dict.get('target_facility', '')
        if cur_str:
            level_condition_dict = parse_cfg_str_to_dict_of_list(cur_str, is_num = True)
    for facility_id, lv in six.iteritems(level_condition_dict):
        facility_lv = get_facility_level(facility_id)
        if facility_lv < lv:
            upgrade_facility_dict[facility_id] = lv
        return upgrade_facility_dict
