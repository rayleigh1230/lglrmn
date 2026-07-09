# Source Generated with Decompyle++
# File: get_facility_of_building.pyc (Python 3.11)

facility_id_us = GameDataMgr().get_sub_key_data(TableID.FACILITY, FacilityField.FACILITY_ID, facility_id)
facility_table = GameDataMgr().get_table(TableID.FACILITY)
for facility_id_u in facility_id_us:
    facility_record = facility_table.get(facility_id_u)
    if facility_record and facility_record[FacilityField.BELONG_ID] == building_id_u:
        
        return None, facility_record
    return None
