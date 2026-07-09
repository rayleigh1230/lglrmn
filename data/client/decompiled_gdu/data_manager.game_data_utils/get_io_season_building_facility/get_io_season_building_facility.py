# Source Generated with Decompyle++
# File: get_io_season_building_facility.pyc (Python 3.11)

game_data_mgr = GameDataMgr()
facility_table = game_data_mgr.get_table(TableID.FACILITY)
self_facilities = { }
my_user_id = game_data_mgr.user_id
io_leader = get_io_team_leader()
for facility_id_u, facility_record in six.iteritems(facility_table):
    facility_id = facility_record[FacilityField.FACILITY_ID]
    if is_io_season_beltline_facility(facility_id):
        if facility_record[FacilityField.USERID] == io_leader:
            self_facilities[facility_id] = (facility_id_u, facility_record)
            continue
        continue
    if facility_record[FacilityField.USERID] == my_user_id and facility_record[FacilityField.BELONG_ID] == building_id_u:
        self_facilities[facility_id] = (facility_id_u, facility_record)
    return self_facilities
