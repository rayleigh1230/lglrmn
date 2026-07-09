# Source Generated with Decompyle++
# File: add_to_facility_finished_tips.pyc (Python 3.11)

if building_id not in g_facility_finished_tips:
    g_facility_finished_tips[building_id] = set()
g_facility_finished_tips[building_id].add(facility_id)
if facility_id in FACILITY_SUB_LEVEL_DICT:
    main_facility_level = FACILITY_SUB_LEVEL_DICT[facility_id]
    add_to_facility_level_finished_tips(building_id, main_facility_level)
    return None
