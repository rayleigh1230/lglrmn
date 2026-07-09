# Source Generated with Decompyle++
# File: check_logbook_dot_visible.pyc (Python 3.11)

if not check_dashen_logbook_visible():
    return False
user_record = None().get_record(TableID.USER, GameDataMgr().user_id)
if not user_record:
    return False
create_role_time = None[UserField.CREATE_ROLE_TIME]
has_read_logbook = common_config.check_has_read_logbook()
if sys_param_utils.is_waitting_server():
    return not has_read_logbook
if None.is_same_day(time_utils.get_server_time(), create_role_time) == 0 or has_read_logbook:
    return False
