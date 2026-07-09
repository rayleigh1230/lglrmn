# Source Generated with Decompyle++
# File: get_user_quest_tip_num.pyc (Python 3.11)

if except_from_type:
    except_from_type = []
npc_mission_mgr = npc_mission_mgr
import data_manager
num = 0
user_npc_mission = npc_mission_mgr.NpcMissionMgr().get_npc_all_mission_dic()
if user_npc_mission:
    neutral_comm_dict = None
    for mission_id, record in six.iteritems(user_npc_mission):
        read_valid = False
        can_receive = False
        if npc_mission_mgr.NpcMissionMgr().is_mission_invalid(mission_id):
            continue
        if record[UserNpcMissionField.STATE] == UserNpcMissionField.State.STATE_WAIT_MISSION_TEAM:
            continue
        if record[UserNpcMissionField.MISSION_FROM_TYPE] in except_from_type:
            continue
        if only_can_accept and record[UserNpcMissionField.STATE] != UserNpcMissionField.State.STATE_UNCHECKED:
            continue
        uncheck_condition = record[UserNpcMissionField.STATE] == UserNpcMissionField.State.STATE_UNCHECKED
        if except_unchecked and uncheck_condition:
            continue
        if include_read and record[UserNpcMissionField.READ] in (UserNpcMissionField.ReadState.READ_STATE_NEW, UserNpcMissionField.ReadState.READ_STATE_WEAK_READ):
            read_valid = True
        if record[UserNpcMissionField.STATE] == 1:
            complete_time = record[UserNpcMissionField.COMPLETE_TIME]
            Tb_cfg_npc_mission_detail = Tb_cfg_npc_mission_detail
            import common.config.db
            mission_detail_record = Tb_cfg_npc_mission_detail.get(record[UserNpcMissionField.DETAIL_ID])
            if mission_detail_record:
                valid_time = mission_detail_record[Tb_cfg_npc_mission_detail.REWARD_TIME]
                can_receive = complete_time + valid_time < time_utils.get_server_time()
            mission_from_type = record[UserNpcMissionField.MISSION_FROM_TYPE]
            is_weekend_mission = mission_from_type == UserNpcMissionField.FromType.FROM_TYPE_WEEKEND_ACTIVITY
            if is_weekend_mission:
                can_receive = True
        if can_receive and record[UserNpcMissionField.MISSION_FROM_TYPE] == UserNpcMissionField.FromType.FROM_TYPE_NEUTRALITY:
            if neutral_comm_dict:
                neutral_comm_dict = get_user_neutral_contract_cooperation_communicating_outpost_ids()
            if record[UserNpcMissionField.MISSION_LIAISON_ID] not in neutral_comm_dict:
                can_receive = False
            elif record[UserNpcMissionField.STATE] == UserNpcMissionField.State.STATE_COMPLETE:
                can_receive = False
if read_valid or can_receive:
    num += 1
continue
return num
