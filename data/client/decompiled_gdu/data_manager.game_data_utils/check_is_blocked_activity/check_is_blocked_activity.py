# Source Generated with Decompyle++
# File: check_is_blocked_activity.pyc (Python 3.11)

if not sys_param_utils.is_first_season():
    return False
if not None:
    return False
if None not in L0_BLOCK_ACTIVITY_ID_LIST:
    return False
for require_level, activity_list in None.iteritems(L0_BLOCK_ACTIVITY_MAP):
    if activity_id in activity_list and require_level > get_base_facility_level():
        return True
    return False
