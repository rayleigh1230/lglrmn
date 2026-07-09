# Source Generated with Decompyle++
# File: get_io_player_support_ship_receive_info.pyc (Python 3.11)

main_record = GameDataMgr().get_record(TableID.USER, GameDataMgr().user_id)
city_record = GameDataMgr().get_record(TableID.USER_CITY, main_record[UserField.MAIN_WID])
if city_record[UserCityField.IO_SUPPORT_TEAM_RECEIVE_INFO]:
    io_support_recive_info = parse_cfg_str_to_list(city_record[UserCityField.IO_SUPPORT_TEAM_RECEIVE_INFO], is_num = True)
    return {
        'already_recive_times': io_support_recive_info[0],
        'recive_state': io_support_recive_info[1],
        'recive_begin_time': io_support_recive_info[2] }
