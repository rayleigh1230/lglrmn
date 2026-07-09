# Source Generated with Decompyle++
# File: get_building_facility.pyc (Python 3.11)

sys_param_utils = sys_param_utils
import data_manager
if sys_param_utils.is_io_season():
    return get_io_season_building_facility(building_id_u)
game_data_mgr = None()
facility_table = game_data_mgr.get_table(TableID.FACILITY)
facility_id_us = game_data_mgr.get_sub_key_data(TableID.FACILITY, FacilityField.BELONG_ID, building_id_u)
self_facilities = { }
for facility_id_u in facility_id_us:
    facility_record = facility_table.get(facility_id_u)
    if facility_record:
        facility_id = facility_record[FacilityField.FACILITY_ID]
        self_facilities[facility_id] = (facility_id_u, facility_record)
    return self_facilities
