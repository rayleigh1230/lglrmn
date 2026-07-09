# Source Generated with Decompyle++
# File: get_sub_building_facility.pyc (Python 3.11)

game_data_mgr = GameDataMgr()
facility_table = game_data_mgr.get_table(TableID.FACILITY)
facility_id_us = game_data_mgr.get_sub_key_data(TableID.FACILITY, FacilityField.BELONG_ID, building_id_u)
self_facilities = { }
for facility_id_u in facility_id_us:
    facility_record = facility_table.get(facility_id_u)
    if facility_record:
        facility_id = facility_record[FacilityField.FACILITY_ID]
        self_facilities[facility_id] = (facility_id_u, facility_record)
    return self_facilities
