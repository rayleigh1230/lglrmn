# Source Generated with Decompyle++
# File: get_self_role_id.pyc (Python 3.11)

user_record = GameDataMgr().get_record(TableID.USER, self.user_id)
if user_record:
    return user_record[UserField.ROLE_ID]
