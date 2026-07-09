# Source Generated with Decompyle++
# File: judge_limit_reward_type.pyc (Python 3.11)

activation_config = Tb_cfg_user_activation.get(judge_level)
is_select_reward = is_battle_pass_select_reward(activation_config, protocol_mode)
if is_select_reward:
    (_, select_index) = judge_battle_pass_select_reward_get(protocol_mode, judge_level)
    (reward_data, _) = get_activation_awards_by_level(protocol_mode, judge_level, select_index)
    res_type = reward_data[0]
else:
    (reward_data, _) = get_activation_awards_by_level(protocol_mode, judge_level)
    res_type = reward_data[0][0]
return res_type
