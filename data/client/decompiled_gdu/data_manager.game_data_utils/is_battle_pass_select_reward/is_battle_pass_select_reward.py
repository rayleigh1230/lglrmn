# Source Generated with Decompyle++
# File: is_battle_pass_select_reward.pyc (Python 3.11)

if not is_new_user_activation_awards_battlepass(server_open_time):
    return False
ProtocolMode = ProtocolMode
import ui.battle_pass_view
is_select_reward = False
if protocol_mode == ProtocolMode.Strategic:
    if is_new_user_activation_awards_battlepass_new_202511(server_open_time):
        is_select_reward = bool(user_activation_cfg[Tb_cfg_user_activation.AWARDS_BATTLEPASS_TYPE_NEW_EX])
    elif is_new_user_activation_awards_battlepass_new_20250611(server_open_time):
        is_select_reward = bool(user_activation_cfg[Tb_cfg_user_activation.AWARDS_BATTLEPASS_TYPE_NEW])
    else:
        is_select_reward = bool(user_activation_cfg[Tb_cfg_user_activation.AWARDS_BATTLEPASS_TYPE])
elif protocol_mode == ProtocolMode.Cooperative:
    if is_new_user_activation_awards_battlepass_new_202511(server_open_time):
        is_select_reward = bool(user_activation_cfg[Tb_cfg_user_activation.AWARDS_TYPE_NEW_EX])
    elif is_new_user_activation_awards_battlepass_new_20250611(server_open_time):
        is_select_reward = bool(user_activation_cfg[Tb_cfg_user_activation.AWARDS_TYPE_NEW])
    else:
        is_select_reward = bool(user_activation_cfg[Tb_cfg_user_activation.AWARDS_TYPE])
return is_select_reward
