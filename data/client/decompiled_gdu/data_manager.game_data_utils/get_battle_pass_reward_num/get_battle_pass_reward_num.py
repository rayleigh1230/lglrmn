# Source Generated with Decompyle++
# File: get_battle_pass_reward_num.pyc (Python 3.11)

show_wealth_management_mainpage_tips = show_wealth_management_mainpage_tips
import ui.wealth_management_mainpage
battle_pass_type = int(activation_record[UserActivationField.BATTLEPASS_TYPE])
awards = parse_cfg_str_to_list(activation_record[UserActivationField.AWARDS], True)
awards_battle_pass = parse_cfg_str_to_list(activation_record[UserActivationField.AWARDS_BATTLEPASS], True)
select_awards = parse_cfg_str_to_list_of_list(activation_record[UserActivationField.AWARDS_SELECTION], True)
select_awards_battle_pass = parse_cfg_str_to_list_of_list(activation_record[UserActivationField.AWARDS_BATTLEPASS_SELECTION], True)
total_reward_num = 0
cur_level = activation_record[UserActivationField.ACTIVATION_LEVEL]
server_open_time = get_server_open_time()
unlock_section_min_level = -1
unlock_section_max_level = -1
if battle_pass_type == UserActivationField.Battlepass.BATTLEPASS_STARLORD_SEATION:
    goods_id_list = parse_cfg_str_to_list(activation_record[UserActivationField.GOODS_ID], True)
    for goods_id, _lv_info in six.iteritems(configdata.GOODS_ID_2_BP_LEVEL):
        if goods_id not in goods_id_list:
            continue
        if unlock_section_min_level > 0:
            unlock_section_min_level = min(_lv_info[0], unlock_section_min_level)
        else:
            unlock_section_min_level = _lv_info[0]
        unlock_section_max_level = max(_lv_info[1], unlock_section_max_level)
        for idx in range(cur_level):
            activation_config = Tb_cfg_user_activation.get(idx + 1)
            if activation_config:
                config_awards = get_user_activation_awards(activation_config, server_open_time)
                total_reward_num += 1 if config_awards else 0
                if battle_pass_type != 0:
                    if unlock_section_min_level > 0 and unlock_section_max_level > 0:
                        if idx + 1 < unlock_section_min_level or idx + 1 > unlock_section_max_level:
                            continue
                    config_awards_battlepass = get_user_activation_awards_battlepass(activation_config)
                    total_reward_num += 1 if config_awards_battlepass else 0
            if sys_param_utils.is_waitting_server():
                unreceived_num = 0
            elif battle_pass_type != 0:
                pass
            
unreceived_num = len(awards_battle_pass) - 0 - len(select_awards) - len(select_awards_battle_pass) if battle_pass_type != 0 else 0
if show_wealth_management_mainpage_tips():
    unreceived_num += 1
return (total_reward_num, unreceived_num)
