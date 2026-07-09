# Source Generated with Decompyle++
# File: get_facility_record.pyc (Python 3.11)

for sub_record in six.itervalues(GameDataMgr().get_table(TableID.FACILITY)):
    if sub_record[FacilityField.USERID] != GameDataMgr().user_id:
        continue
    if sub_record[FacilityField.FACILITY_ID] == facility_id:
        
        return None, sub_record
    return None
