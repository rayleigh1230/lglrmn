# Source Generated with Decompyle++
# File: get_user_free_chu_coin_value.pyc (Python 3.11)

user_record = GameDataMgr().get_record(TableID.USER, GameDataMgr().user_id)
if user_record:
    return user_record[UserField.FREE_YUAN_BAO]
