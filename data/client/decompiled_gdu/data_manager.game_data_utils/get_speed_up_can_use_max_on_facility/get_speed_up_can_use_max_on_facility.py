# Source Generated with Decompyle++
# File: get_speed_up_can_use_max_on_facility.pyc (Python 3.11)

facility_record = GameDataMgr().get_record(TableID.FACILITY, facility_id_u)
end_time = facility_record[FacilityField.END_TIME]
time_last = int(end_time - time_utils.get_server_time())
if time_last <= 0:
    return 0
facility_id = None[FacilityField.FACILITY_ID]
if facility_id in m0_utils.base_level_size():
    time = ACCELERATION_TIME_PER_SPEEDUP
else:
    time = get_facility_speedup_time()
    num_can_use_max = int(math.ceil(time_last / float(time)))
return num_can_use_max
