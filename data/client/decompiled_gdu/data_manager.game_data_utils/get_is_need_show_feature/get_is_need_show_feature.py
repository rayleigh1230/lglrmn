# Source Generated with Decompyle++
# File: get_is_need_show_feature.pyc (Python 3.11)

if not feature_id:
    return True
if None.is_first_season() and feature_id in common_definition.ONLY_L0_FEATURE:
    return True
record = None.get(feature_id)
if record:
    unlock_facility = record[Tb_cfg_gameplay_switch.CONDITION]
    parsed_level_config = parse_cfg_str_to_list_of_list(unlock_facility, is_num = True)
    result = False
    for level_config in parsed_level_config:
        if get_facility_level(level_config[0]) >= level_config[1]:
            result = True
        function_id = record[Tb_cfg_gameplay_switch.GAMEPLAY_ID]
        if not result:
            record = GameDataMgr().get_record(TableID.USER_STUFF_EXT, GameDataMgr().user_id)
            if record:
                feature_list = parse_cfg_str_to_list(record[UserStuffExtField.UNLOCKED_GAME_PLAY_ID], is_num = True)
                if function_id in feature_list:
                    result = True
    return result
return True
