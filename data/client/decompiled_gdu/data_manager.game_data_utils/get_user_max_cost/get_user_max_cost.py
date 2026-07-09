# Source Generated with Decompyle++
# File: get_user_max_cost.pyc (Python 3.11)

if not sys_param_utils.is_waitting_server() and is_player_home_base(building_id):
    sub_team_table = GameDataMgr().get_table(TableID.SUB_TEAM)
    for sub_team_id, sub_team_record in six.iteritems(sub_team_table):
        if sub_team_record[SubTeamField.WORLD_ITEM_ID] == building_id:
            
            return None, sub_team_record[SubTeamField.MILITARY_COST_MAX]
        return user_record[UserCityField.TEAM_COST_LIMIT]
        GameDataMgr().get_record(TableID.USER_CITY, building_id) = GameDataMgr().get_record(TableID.USER_CITY, get_player_base_building_id())
        return user_record[UserCityField.TEAM_COST_LIMIT]
