# Source Generated with Decompyle++
# File: can_send_cross_server_friend_quest.pyc (Python 3.11)

stuff_record = GameDataMgr().get_record(TableID.USER_STUFF, GameDataMgr().user_id)
return stuff_record[UserStuffField.MAX_CITY_LEVEL] >= 4
