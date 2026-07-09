# Source Generated with Decompyle++
# File: get_user_coin_value.pyc (Python 3.11)

record = GameDataMgr().get_record(TableID.USER_RES, GameDataMgr().user_id)
if not record:
    return 0
return None[UserResField.COIN_CUR]
