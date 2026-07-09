# Source Generated with Decompyle++
# File: judge_battle_get_reward_valid.pyc (Python 3.11)

LoginDataMgr = LoginDataMgr
import login.login_data_mgr
ProtocolMode = ProtocolMode
import ui.battle_pass_view
ServerKeyField = ServerKeyField
import ui.server_select_view
current_run_server_id = LoginDataMgr().get_selected_server_info()[ServerKeyField.Run_Server_Id]
activation_record = GameDataMgr().get_record(TableID.USER_ACTIVATION, GameDataMgr().user_id)
received_award_run_server_id_list_str = None
received_award_str = None
if protocol_mode == ProtocolMode.Strategic:
    received_award_run_server_id_list_str = activation_record[UserActivationField.AWARDS_BATTLEPASS_RUN_SERVER_ID]
    received_award_str = activation_record[UserActivationField.AWARDS_BATTLEPASS]
elif protocol_mode == ProtocolMode.Cooperative:
    received_award_run_server_id_list_str = activation_record[UserActivationField.AWARDS_RUN_SERVER_ID]
    received_award_str = activation_record[UserActivationField.AWARDS]
if received_award_str and judge_level in parse_cfg_str_to_list(received_award_str, True):
    return False
if not None:
    return True
for data in None(received_award_run_server_id_list_str, True):
    level = data[0]
    run_server_id = data[1]
    if judge_level == level and current_run_server_id != run_server_id:
        return False
    return True
