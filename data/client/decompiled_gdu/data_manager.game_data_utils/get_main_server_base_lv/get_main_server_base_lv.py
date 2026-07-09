# Source Generated with Decompyle++
# File: get_main_server_base_lv.pyc (Python 3.11)

record = GameDataMgr().get_record(TableID.USER_STUFF_EX, GameDataMgr().user_id)
if not record:
    return 0
return None[UserStuffExField.MAIN_SERVER_BASE_CITY_LEVEL]
