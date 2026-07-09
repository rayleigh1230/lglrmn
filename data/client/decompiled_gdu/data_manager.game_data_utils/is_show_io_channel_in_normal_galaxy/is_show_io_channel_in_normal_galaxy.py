# Source Generated with Decompyle++
# File: is_show_io_channel_in_normal_galaxy.pyc (Python 3.11)

record = GameDataMgr().get_record(TableID.IO_TEAMWORK_MEMBER, GameDataMgr().user_id)
if record and record[IoTeamworkMemberField.CUR_STATE] == IoTeamworkMemberField.State.STATE_NONE:
    return True
