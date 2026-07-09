# Source Generated with Decompyle++
# File: get_npc_mission_level.pyc (Python 3.11)

npc_mission_mgr = npc_mission_mgr
import data_manager
user_npc_record = npc_mission_mgr.NpcMissionMgr().get_user_mission_record(mission_id)
level = None
if user_npc_record:
    level = user_npc_record[UserNpcMissionField.LEVEL]
    if level == 0:
        detail_id = user_npc_record[UserNpcMissionField.DETAIL_ID]
        npc_mission_record = Tb_cfg_npc_mission.get(detail_id / 10)
        if npc_mission_record:
            level = npc_mission_record[Tb_cfg_npc_mission.LEVEL]
return level
