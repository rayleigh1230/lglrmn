# Source Generated with Decompyle++
# File: get_facility_level.pyc (Python 3.11)

facility_table = GameDataMgr().get_table(TableID.FACILITY)
if building_id_u:
    building_id_u = get_player_base_building_id()
for facility_id_u, facility_record in six.iteritems(facility_table):
    if facility_record[FacilityField.BELONG_ID] == building_id_u and facility_id == facility_record[FacilityField.FACILITY_ID]:
        
        return None, facility_record[FacilityField.LEVEL]
    return 0
