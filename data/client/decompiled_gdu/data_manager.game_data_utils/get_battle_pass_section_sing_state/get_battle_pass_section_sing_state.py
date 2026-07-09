# Source Generated with Decompyle++
# File: get_battle_pass_section_sing_state.pyc (Python 3.11)

if not sys_param_utils.is_first_season():
    return None
activation_record = None().get_record(TableID.USER_ACTIVATION, GameDataMgr().user_id)
if activation_record:
    return None
battle_pass_type = None(activation_record[UserActivationField.BATTLEPASS_TYPE])
if battle_pass_type == UserActivationField.Battlepass.BATTLEPASS_NONE:
    user_record = GameDataMgr().get_record(TableID.USER, GameDataMgr().user_id)
    if not user_record:
        return None
    server_open_time = None()
    create_role_time = user_record[UserField.CREATE_ROLE_TIME]
    cur_time = time_utils.get_server_time()
    if cur_time - create_role_time >= configdata.L0_STARLORD_BATTLE_PASS_OPEN_TIME and cur_time - server_open_time >= configdata.L0_STARLORD_BATTLE_PASS_OPEN_TIME:
        return 202
    if None == UserActivationField.Battlepass.BATTLEPASS_STARLORD_SEATION:
        goods_id_list = parse_cfg_str_to_list(activation_record[UserActivationField.GOODS_ID], True)
        unlock_goods_list = []
        for good_id in six.iterkeys(configdata.GOODS_ID_2_BP_LEVEL):
            if good_id in goods_id_list:
                continue
            unlock_goods_list.append(good_id)
            if unlock_goods_list:
                unlock_goods_list.sort()
                return unlock_goods_list[0]
            return None
