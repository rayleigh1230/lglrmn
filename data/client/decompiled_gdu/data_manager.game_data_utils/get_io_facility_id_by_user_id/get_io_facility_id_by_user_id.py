# Source Generated with Decompyle++
# File: get_io_facility_id_by_user_id.pyc (Python 3.11)

facility_ids = common_definition.team_camp_facility_list
io_user_list = get_io_user_list()
if user_id in io_user_list:
    idx = io_user_list.index(user_id)
    return facility_ids[idx]
