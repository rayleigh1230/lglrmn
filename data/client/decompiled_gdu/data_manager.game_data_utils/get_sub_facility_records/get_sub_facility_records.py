# Source Generated with Decompyle++
# File: get_sub_facility_records.pyc (Python 3.11)

if is_sub_facility(facility_id):
    return { }
ret = None
facility_table = GameDataMgr().get_table(TableID.FACILITY)
user_id = GameDataMgr().user_id
for sub_record in six.itervalues(facility_table):
    if sub_record[FacilityField.USERID] != user_id:
        continue
    sub_facility_id = sub_record[FacilityField.FACILITY_ID]
    if is_sub_facility(sub_facility_id) and sub_facility_id_to_main_facility_id(sub_facility_id) == facility_id:
        ret[sub_facility_id] = sub_record
    return ret
