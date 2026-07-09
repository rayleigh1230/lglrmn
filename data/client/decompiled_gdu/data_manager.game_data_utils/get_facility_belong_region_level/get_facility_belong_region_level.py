# Source Generated with Decompyle++
# File: get_facility_belong_region_level.pyc (Python 3.11)

if is_sub_facility(facility_id):
    facility_id = sub_facility_id_to_main_facility_id(facility_id)
cfg = m0_utils.get_facility_level_cfg(facility_id, 1)
condition_str = cfg[Tb_cfg_facility_level_ex.CONDITION_NEW]
if condition_str:
    condition_json = JsonUtil.loads(condition_str)
    if condition_json:
        target_facility_str = condition_json.get('target_facility')
        if target_facility_str:
            target_facility = parse_cfg_str_to_dict_of_list(target_facility_str, is_num = True)
            if target_facility:
                for k, v in six.iteritems(target_facility):
                    if k in (CfgFacilityField.Fid.FID_CENTER_AREA_SIZE, CfgFacilityField.Fid.FID_GANG_QU_SIZE, CfgFacilityField.Fid.FID_INDUSTRIAL_AREA_SIZE):
                        
                        return None, (k, v)
                    return (None, None)
