# Source Generated with Decompyle++
# File: get_io_user_city_max_cost_by_userid.pyc (Python 3.11)

user_city_table = GameDataMgr().get_table(TableID.USER_CITY)
for key, user_city_record in six.iteritems(user_city_table):
    if user_city_record[UserCityField.USERID] == user_id:
        max_cost_info = user_city_record[UserCityField.COST_MAX]
        max_cost_info = parse_cfg_str_to_list(max_cost_info, True, [
            0,
            0,
            0])
        
        return None, max_cost_info[0]
    return 0
