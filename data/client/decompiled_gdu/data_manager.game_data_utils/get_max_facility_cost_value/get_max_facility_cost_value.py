# Source Generated with Decompyle++
# File: get_max_facility_cost_value.pyc (Python 3.11)

FACILITY_COST_ID = 460
ENGINEER_COST_ID = 461
max_cost = 0
self_facilities = get_building_facility(building_id)
if self_facilities:
    for facility_id_u, facility_record in six.iteritems(self_facilities):
        level = facility_record[FacilityField.LEVEL]
        if level == 0:
            continue
        facility_level_cfg = m0_utils.get_facility_level_cfg(facility_id, level)
        if not facility_level_cfg:
            continue
        effect = parse_cfg_str_to_dict_of_list(facility_level_cfg[Tb_cfg_facility_level_ex.EFFECTS], True)
        if is_engineer_harbour:
            if ENGINEER_COST_ID in effect:
                max_cost += effect[ENGINEER_COST_ID]
            continue
        if FACILITY_COST_ID in effect:
            max_cost += effect[FACILITY_COST_ID]
        return max_cost
