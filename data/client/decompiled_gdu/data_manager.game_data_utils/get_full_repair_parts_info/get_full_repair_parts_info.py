# Source Generated with Decompyle++
# File: get_full_repair_parts_info.pyc (Python 3.11)

user_city_record = GameDataMgr().get_record(TableID.USER_CITY, building_id_u)
if user_city_record:
    repair_parts = parse_cfg_str_to_list(user_city_record[UserCityField.REPAIR_PARTS], is_num = True)
    (_cur, _speed, _max, _time, _out) = (repair_parts[0], repair_parts[1], repair_parts[2], repair_parts[3], repair_parts[4])
    building_info = (_cur, _speed, _max, _cur + _out)
else:
    building_info = (0, 0, 0, 0)
team_info_list = []
cur_user_id = GameDataMgr().user_id
team_attr_table = GameDataMgr().get_table(TableID.TEAM_ATTR)
for team_id, attr_record in six.iteritems(team_attr_table):
    if attr_record[TeamAttrField.USERID] == cur_user_id and attr_record[TeamAttrField.EXPLOIT_RES_INFO]:
        team_record = GameDataMgr().get_record(TableID.TEAM, team_id)
        if team_record and team_record[TeamField.BELONG_ID] == building_id_u:
            cur_capacity = parse_cfg_str_to_dict_of_list(attr_record[TeamAttrField.EXPLOIT_RES_INFO], True)
            carry_repair_parts_num = cur_capacity.get(CfgResDefField.ResId.RES_ID_REPAIR_PARTS, 0)
            if carry_repair_parts_num > 0:
                team_info_list.append((team_id, carry_repair_parts_num))
    return (building_info, team_info_list)
