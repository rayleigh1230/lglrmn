# Source Generated with Decompyle++
# File: is_juvenile_lock_open.pyc (Python 3.11)

record = GameDataMgr().get_record(TableID.USER_JUVENILE, GameDataMgr().user_id)
if not record:
    return False
return None[UserJuvenileField.LOCK_STATE] == UserJuvenileField.LockState.LOCK_STATE_YES
