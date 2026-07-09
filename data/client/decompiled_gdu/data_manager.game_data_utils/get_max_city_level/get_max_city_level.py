# Source Generated with Decompyle++
# File: get_max_city_level.pyc (Python 3.11)

stuff_record = GameDataMgr().get_record(TableID.USER_STUFF, GameDataMgr().user_id)
return stuff_record[UserStuffField.MAX_CITY_LEVEL]
