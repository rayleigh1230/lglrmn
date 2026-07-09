# Source Generated with Decompyle++
# File: get_push_notify_val.pyc (Python 3.11)

stuff_record = GameDataMgr().get_record(TableID.USER_STUFF, GameDataMgr().user_id)
if not stuff_record:
    return False
push_val = None[UserStuffField.PUSH_NOTIFY]
total_len = UserStuffField.PlatformNotify.PLATFORM_NOTIFY_STRANGER_INFORMATION
option_str = format(push_val, '0{}b'.format(total_len))
val = int(option_str[total_len - notify_key - 1])
return val == 1
