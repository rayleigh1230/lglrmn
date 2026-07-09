# Source Generated with Decompyle++
# File: get_sub_center_aircraft_num_limit_effect.pyc (Python 3.11)

num_limit_effects = { }
building_id = get_player_base_building_id()
self_facilities = get_building_facility(building_id)
if self_facilities:
    for facility_id in (CfgFacilityField.Fid.FID_SUB_COMMAND_CENTER_1, CfgFacilityField.Fid.FID_SUB_COMMAND_CENTER_2):
        if facility_id not in self_facilities:
            continue
        facility_record = self_facilities[facility_id][1]
        level = facility_record[FacilityField.LEVEL]
        if level == 0:
            continue
        facility_level_cfg = m0_utils.get_facility_level_cfg(facility_id, level)
        if not facility_level_cfg:
            continue
        cfg_facility = Tb_cfg_facility.get(facility_id)
        num_limit_effects[facility_id] = {
            'name': cfg_facility[Tb_cfg_facility.NAME],
            'effect': 0 }
        effect = parse_cfg_str_to_dict_of_list(facility_level_cfg[Tb_cfg_facility_level_ex.EFFECTS], True)
        if common_definition.EFFECT_ADD_SUB_CENTER_AIRCRAFT_NUM_LIMIT:
            pass
        return num_limit_effects
