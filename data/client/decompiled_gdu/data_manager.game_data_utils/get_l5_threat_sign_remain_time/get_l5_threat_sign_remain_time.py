# Source Generated with Decompyle++
# File: get_l5_threat_sign_remain_time.pyc (Python 3.11)

team_record = GameDataMgr().get_record(TableID.TEAM, team_id)
if team_record:
    if team_record[TeamField.USERID] == 0:
        return 0
    extra_info = None[TeamField.EXTRA_INFO]
    if not extra_info:
        return 0
    extra_info = None.loads(extra_info)
    return extra_info.get(str(TeamField.ExtraKey.EXTRA_KEY_IO_MARK_EXPIRED), 0)
