# Source Generated with Decompyle++
# File: is_io_in_team.pyc (Python 3.11)

user_city = GameDataMgr().get_record(TableID.USER_CITY, get_player_base_building_id())
if user_city[UserCityField.IO_CAMP_TYPE] == 0 and user_city[UserCityField.IO_COMP_ID] > 0:
    return True
