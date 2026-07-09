# Source Generated with Decompyle++
# File: is_in_io_team.pyc (Python 3.11)

record = GameDataMgr().get_record(TableID.IO_TEAMWORK_MEMBER, GameDataMgr().user_id)
if record:
    return True
