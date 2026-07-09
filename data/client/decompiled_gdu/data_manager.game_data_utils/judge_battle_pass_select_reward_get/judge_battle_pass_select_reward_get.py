# Source Generated with Decompyle++
# File: judge_battle_pass_select_reward_get.pyc (Python 3.11)

ProtocolMode = ProtocolMode
import ui.battle_pass_view
is_select_reward_received = False
select_receive_reward_index = None
activation_record = GameDataMgr().get_record(TableID.USER_ACTIVATION, GameDataMgr().user_id)
received_award_str = None
if protocol_mode == ProtocolMode.Strategic:
    received_award_str = activation_record[UserActivationField.AWARDS_BATTLEPASS_SELECTION]
elif protocol_mode == ProtocolMode.Cooperative:
    received_award_str = activation_record[UserActivationField.AWARDS_SELECTION]
if received_award_str:
    select_receive_rewards = parse_cfg_str_to_list_of_list(received_award_str, True)
    for selected_data in select_receive_rewards:
        (level, index) = selected_data
        if level == judge_level:
            is_select_reward_received = True
            select_receive_reward_index = index
            
            return None, (is_select_reward_received, select_receive_reward_index)
        return (is_select_reward_received, select_receive_reward_index)
