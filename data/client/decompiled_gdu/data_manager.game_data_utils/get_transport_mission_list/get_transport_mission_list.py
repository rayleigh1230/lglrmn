# Source Generated with Decompyle++
# File: get_transport_mission_list.pyc (Python 3.11)

npc_mission_mgr = npc_mission_mgr
import data_manager
item_record = GameDataMgr().get_record(TableID.WORLD_ITEM, selecting_obj_id)
transport_list = npc_mission_mgr.NpcMissionMgr().check_building_is_target_by_id(item_record[WorldItemField.ID], target_mission_type = CfgNpcMissionDetailField.CondId.COND_ID_TRANSPORT)
neturial_transport_list = npc_mission_mgr.NpcMissionMgr().check_building_is_target_by_id(item_record[WorldItemField.ID], target_mission_type = CfgNpcMissionDetailField.CondId.COND_ID_NEUTRALITY_TRANSPORT)
transport_res_list = npc_mission_mgr.NpcMissionMgr().check_building_is_target_by_id(item_record[WorldItemField.ID], target_mission_type = CfgNpcMissionDetailField.CondId.COND_ID_TRANSPORT_RES)
_list = transport_list
_list.extend(neturial_transport_list)
_list.extend(transport_res_list)
return _list
