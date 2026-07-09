# Source Generated with Decompyle++
# File: get_unlock_repair_parts_facility_id_and_level.pyc (Python 3.11)

(facility_id, facility_lv) = (0, 0)
if UNLOCK_REPAIR_PARTS_FACILITY_IDS:
    facility_lv = 1
    facility_id = UNLOCK_REPAIR_PARTS_FACILITY_IDS[0][0]
return (facility_id, facility_lv)
