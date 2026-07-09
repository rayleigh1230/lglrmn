# Source Generated with Decompyle++
# File: get_juvenile_lock_param.pyc (Python 3.11)

(has_code, is_lock_open, is_in_audit, audit_closing_time) = (False, False, False, 0)
record = GameDataMgr().get_record(TableID.USER_JUVENILE, GameDataMgr().user_id)
if not record:
    return (has_code, is_lock_open, is_in_audit, audit_closing_time)
has_code = None[UserJuvenileField.HAD_SECURITY_CODE] == 1
audit_closing_time = record[UserJuvenileField.AUDIT_CLOSING_TIME]
is_lock_open = is_juvenile_lock_open()
is_in_audit = time_utils.get_server_time() < audit_closing_time
return (has_code, is_lock_open, is_in_audit, audit_closing_time)
