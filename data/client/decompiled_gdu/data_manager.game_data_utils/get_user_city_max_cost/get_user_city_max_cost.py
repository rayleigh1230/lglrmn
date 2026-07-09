# Source Generated with Decompyle++
# File: get_user_city_max_cost.pyc (Python 3.11)

if not sys_param_utils.is_waitting_server() and is_player_home_base(building_id_u):
    return get_user_max_cost(building_id_u)
max_cost = None
user_city_record = GameDataMgr().get_record(TableID.USER_CITY, building_id_u)
if user_city_record:
    max_cost_info = user_city_record[UserCityField.COST_MAX]
    max_cost_info = parse_cfg_str_to_list(max_cost_info, True, [
        0,
        0,
        0])
    if is_engineer_cost:
        max_cost = max_cost_info[1]
    else:
        max_cost = max_cost_info[0]
return max_cost
