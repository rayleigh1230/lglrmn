# Source Generated with Decompyle++
# File: get_activation_awards_by_level.pyc (Python 3.11)

ProtocolMode = ProtocolMode
import ui.battle_pass_view
activation_config = Tb_cfg_user_activation.get(judge_level)
awards_data = None
if protocol_mode == ProtocolMode.Strategic:
    awards_data = get_user_activation_awards_battlepass(activation_config)
elif protocol_mode == ProtocolMode.Cooperative:
    awards_data = get_user_activation_awards(activation_config)
is_select_reward = is_battle_pass_select_reward(activation_config, protocol_mode)
if is_select_reward and index:
    return (parse_cfg_str_to_list_of_list(awards_data, True)[index], is_select_reward)
return (None(awards_data, True), is_select_reward)
