# Source Generated with Decompyle++
# File: get_io_season_single_facility_record.pyc (Python 3.11)

game_data_mgr = GameDataMgr()
facility_table = game_data_mgr.get_table(TableID.FACILITY)
my_user_id = game_data_mgr.user_id
io_leader = get_io_team_leader()
for facility_id_u, facility_record in six.iteritems(facility_table):
    cur_facility_id = facility_record[FacilityField.FACILITY_ID]
    if cur_facility_id != facility_id:
        continue
    if is_io_season_beltline_facility(cur_facility_id) and facility_record[FacilityField.USERID] == io_leader:
        
        return None, facility_record
    if None[FacilityField.USERID] == my_user_id and facility_record[FacilityField.BELONG_ID] == building_id_u:
        
        return None, facility_record
    return None
