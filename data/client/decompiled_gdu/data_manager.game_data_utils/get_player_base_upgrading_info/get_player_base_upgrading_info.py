# Source Generated with Decompyle++
# File: get_player_base_upgrading_info.pyc (Python 3.11)

upgrading_count = 0
self_facilities = get_building_facility(get_player_base_building_id())
for _, facility_record in six.iteritems(self_facilities):
    if facility_id not in m0_utils.base_level_size() and facility_record[FacilityField.STATE] in (FacilityField.State.STATE_UPGRADING, FacilityField.State.STATE_BUILDING):
        upgrading_count += 1
    robot_utils = robot_utils
    import ui.efficiency_robot_module
    return (upgrading_count, robot_utils.get_max_facility_build_num())
