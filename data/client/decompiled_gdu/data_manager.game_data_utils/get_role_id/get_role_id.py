# Source Generated with Decompyle++
# File: get_role_id.pyc (Python 3.11)

record = GameDataMgr().get_record(TableID.USER, GameDataMgr().user_id)
if record:
    return record[UserField.ROLE_ID]
