# Source Generated with Decompyle++
# File: get_io_team_leader.pyc (Python 3.11)

user_city = GameDataMgr().get_record(TableID.USER_CITY, get_player_base_building_id())
return user_city[UserCityField.IO_LEADER_USERID]
