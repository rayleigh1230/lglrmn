# Source Generated with Decompyle++
# File: get_user_activation_awards_battlepass.pyc (Python 3.11)

Tb_cfg_user_activation = Tb_cfg_user_activation
import common.config.db
ProtocolMode = ProtocolMode
import ui.battle_pass_view
is_select_reward = is_battle_pass_select_reward(user_activation_cfg, ProtocolMode.Strategic, server_open_time)
if not is_new_user_activation_awards_battlepass(server_open_time):
    return user_activation_cfg[Tb_cfg_user_activation.AWARDS_BATTLEPASS_OLD]
if None(server_open_time):
    return user_activation_cfg[Tb_cfg_user_activation.AWARDS_BATTLEPASS_SELECTION_NEW_EX] if is_select_reward else user_activation_cfg[Tb_cfg_user_activation.AWARDS_BATTLEPASS_NEW_EX]
if None(server_open_time):
    return user_activation_cfg[Tb_cfg_user_activation.AWARDS_BATTLEPASS_SELECTION_NEW] if is_select_reward else user_activation_cfg[Tb_cfg_user_activation.AWARDS_BATTLEPASS_NEW]
return user_activation_cfg[Tb_cfg_user_activation.AWARDS_BATTLEPASS_SELECTION] if None else user_activation_cfg[Tb_cfg_user_activation.AWARDS_BATTLEPASS]
