# Source Generated with Decompyle++
# File: get_io_user_id_by_facility_id.pyc (Python 3.11)

facility_ids = common_definition.team_camp_facility_list
if not io_user_list:
    io_user_list = get_io_user_list()
if facility_id in facility_ids:
    idx = facility_ids.index(facility_id)
    if idx >= len(io_user_list):
        return None
    return None[idx]
