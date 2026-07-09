# Source Generated with Decompyle++
# File: get_control_res_add_speed_dic.pyc (Python 3.11)

ControlMissionRewardDropField = ControlMissionRewardDropField
CfgItemControlledEffectField = CfgItemControlledEffectField
import common.config.table_definition
Tb_cfg_npc_mission_detail = Tb_cfg_npc_mission_detail
import common.config.db
NPCMissionDetailView = NPCMissionDetailView
import ui.npc_mission_detail_view
OccupyControlDataMgr = OccupyControlDataMgr
import data_manager.occupy_control.occupy_control_data_mgr
Tb_cfg_world_item = Tb_cfg_world_item
import common.config.db
reward_drop_utils = reward_drop_utils
import data_manager.res_info.reward_drop
res_add_control_effect_speed_dict = { }
res_id_limit = (CfgResDefField.ResId.RES_ID_METAL, CfgResDefField.ResId.RES_ID_CRYSTAL, CfgResDefField.ResId.RES_ID_DEUTERIUM)
for _, record in six.iteritems(GameDataMgr().get_table(TableID.CONTROL_MISSION_REWARD_DROP)):
    if (record[ControlMissionRewardDropField.USERID] == GameDataMgr().user_id or record[ControlMissionRewardDropField.EFFECT_ID] in (CfgItemControlledEffectField.Id.ID_MISSION_REWARD_DROP_ON_TIME, CfgItemControlledEffectField.Id.ID_MISSION_REWARD_DROP_RES_ON_TIME)) and record[ControlMissionRewardDropField.TARGET_ID] in OccupyControlDataMgr().get_occupy_control_valid_target_id_list():
        effect_hours = parse_cfg_str_to_list(record[ControlMissionRewardDropField.REWARD_HOURS], is_num = True)
        cfg = Tb_cfg_npc_mission_detail.get(record[ControlMissionRewardDropField.MISSION_DETAIL_ID])
        reward_cfg = cfg[Tb_cfg_npc_mission_detail.REWARD]
        res_dic = NPCMissionDetailView.cfg_str_to_dict_of_list(reward_cfg, is_num = True)
        for res_id, speed_per_reward in six.iteritems(res_dic):
            if res_id not in res_id_limit:
                continue
            add_speed = speed_per_reward / 24 / len(effect_hours)
            item_dic = {
                'name': record[ControlMissionRewardDropField.TARGET_NAME],
                'add_speed': add_speed,
                'time': record[ControlMissionRewardDropField.CONTROL_TIME] }
            if res_id not in res_add_control_effect_speed_dict:
                res_add_control_effect_speed_dict[res_id] = {
                    'total_add_speed': add_speed,
                    'items': [
                        item_dic] }
                continue
            res_add_control_effect_speed_dict[res_id]['items'].append(item_dic)
            for None in OccupyControlDataMgr().get_l5_occupy_control_reward_list():
                (world_item_id, world_item_cfg_id, name, time) = l5_occupy_control_reward
                cfg = Tb_cfg_world_item.get(world_item_cfg_id)
                effect_hours = parse_cfg_str_to_list(cfg[Tb_cfg_world_item.EXTRA_DATA_3], is_num = True)
                reward_drop_id_list = parse_cfg_str_to_list(cfg[Tb_cfg_world_item.EXTRA_DATA_1], is_num = True)
                for reward_drop_id in reward_drop_id_list:
                    (reward_list, _) = reward_drop_utils.get_drop_res_list(reward_drop_id)
                    for reward in reward_list:
                        args = reward.arg_list()
                        res_id = args[0]
                        if res_id not in res_id_limit:
                            continue
                        res_num = args[1]
                        add_speed = res_num / 24 / len(effect_hours)
                        item_dic = {
                            'name': name,
                            'add_speed': add_speed,
                            'time': time }
                        if res_id not in res_add_control_effect_speed_dict:
                            res_add_control_effect_speed_dict[res_id] = {
                                'total_add_speed': add_speed,
                                'items': [
                                    item_dic] }
                            continue
                        res_add_control_effect_speed_dict[res_id]['items'].append(item_dic)
                        return res_add_control_effect_speed_dict
