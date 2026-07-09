# Source Generated with Decompyle++
# File: get_io_user_list.pyc (Python 3.11)

user_city = GameDataMgr().get_record(TableID.USER_CITY, get_player_base_building_id())
return parse_cfg_str_to_list(user_city[UserCityField.IO_USERID_LIST], is_num = True)
