# Source Generated with Decompyle++
# File: get_aircraft_platform_max_cost_value.pyc (Python 3.11)

if not is_player_home_base(building_id):
    stuff_record = GameDataMgr().get_record(TableID.USER_STUFF_EX, GameDataMgr().user_id)
    if stuff_record:
        return stuff_record.get(UserStuffExField.SUB_CENTER_AIRCRAFT_LIMIT, 0)
    return None
user_city_record = None().get_record(TableID.USER_CITY, building_id)
cost_max = parse_cfg_str_to_list(user_city_record[UserCityField.COST_MAX], is_num = True, default = [
    0,
    0,
    0])
return cost_max[2]
