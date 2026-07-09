# Source Generated with Decompyle++
# File: get_user_quest_m3_tips_num.pyc (Python 3.11)

npc_mission_mgr = npc_mission_mgr
import data_manager
num = 0
user_npc_mission = npc_mission_mgr.NpcMissionMgr().get_npc_all_mission_dic()
if user_npc_mission:
    for mission_id, record in six.iteritems(user_npc_mission):
        if record[UserNpcMissionField.MISSION_FROM_TYPE] != UserNpcMissionField.FromType.FROM_TYPE_WEEKEND_ACTIVITY:
            continue
        if npc_mission_mgr.NpcMissionMgr().is_mission_invalid(mission_id):
            continue
        if record[UserNpcMissionField.STATE] == UserNpcMissionField.State.STATE_WAIT_MISSION_TEAM:
            continue
        if record[UserNpcMissionField.STATE] != UserNpcMissionField.State.STATE_UNCHECKED:
            continue
        if record[UserNpcMissionField.READ] != UserNpcMissionField.ReadState.READ_STATE_NEW:
            continue
        num += 1
        return num
