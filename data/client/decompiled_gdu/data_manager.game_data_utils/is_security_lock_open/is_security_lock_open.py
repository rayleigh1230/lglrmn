# Source Generated with Decompyle++
# File: is_security_lock_open.pyc (Python 3.11)

record = GameDataMgr().get_record(TableID.USER, GameDataMgr().user_id)
if record:
    is_security_lock_open = record[UserField.SECURITY_LOCK_OPEN] == UserField.SecurityLockOpenType.SECURITY_LOCK_OPEN_TYPE_YES
    return is_security_lock_open
