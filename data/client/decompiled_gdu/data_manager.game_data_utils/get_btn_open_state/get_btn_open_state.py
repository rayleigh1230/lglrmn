# Source Generated with Decompyle++
# File: get_btn_open_state.pyc (Python 3.11)

if btn_id in BTN_JUDGE_DICT:
    gdm = GameDataMgr()
    if btn_id == common_definition.BtnType.BTN_TYPE_TEAM_MASS:
        _id = BTN_JUDGE_DICT[btn_id][1 if is_player else 0]
    else:
        _id = BTN_JUDGE_DICT[btn_id]
    state = 0
    stuff_record = gdm.get_record(TableID.USER_STUFF, gdm.user_id)
    if stuff_record:
        user_command = stuff_record[UserStuffField.UNLOCK_USER_COMMAND]
        if user_command:
            data = parse_cfg_str_to_list(user_command, True)
            state = _id in data
    return state
