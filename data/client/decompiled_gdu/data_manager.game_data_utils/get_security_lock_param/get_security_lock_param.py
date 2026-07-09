# Source Generated with Decompyle++
# File: get_security_lock_param.pyc (Python 3.11)

(is_has_security_code, is_lock_open, is_in_audit, audit_closing_time) = (False, False, False, 0)
community_record = GameDataMgr().get_record(TableID.USER_COMMUNITY, GameDataMgr().user_id)
user_record = GameDataMgr().get_record(TableID.USER, GameDataMgr().user_id)
if community_record:
    is_has_security_code = community_record[UserCommunityField.HAD_SECURITY_CODE] == UserCommunityField.HadSecurityCodeType.HAD_SECURITY_CODE_TYPE_YES
    audit_closing_time = community_record[UserCommunityField.SECURITY_CODE_AUDIT_CLOSING_TIME]
    is_in_audit = time_utils.get_server_time() < audit_closing_time
if user_record:
    is_lock_open = is_security_lock_open()
return (is_has_security_code, is_lock_open, is_in_audit, audit_closing_time)
