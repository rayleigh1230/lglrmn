# Source Generated with Decompyle++
# File: get_need_name_rewards.pyc (Python 3.11)

need_name_reward = []
all_res_def_data = Tb_cfg_res_def.get_all_data()
for res_id, res_data in six.iteritems(all_res_def_data):
    if res_id <= 100:
        res_priority = res_data[Tb_cfg_res_def.PRIORITY]
        need_name = res_data[Tb_cfg_res_def.NEED_NAME]
        if res_priority > 0 and need_name == 1:
            need_name_reward.append(res_id)
    need_name_reward.append(CfgResDefField.ResId.RES_ID_NPC_TEAM_EFFECT)
    need_name_reward.append(CfgResDefField.ResId.RES_ID_SHIP_WRECK)
    need_name_reward.append(CfgResDefField.ResId.RES_ID_PLAYER_SHIP_WRECK)
    need_name_reward.append(CfgResDefField.ResId.RES_ID_SELF_SHIP_WRECK)
    need_name_reward.append(CfgResDefField.ResId.RES_ID_ECOLOGY_OUTPUT)
    need_name_reward.append(CfgResDefField.ResId.RES_ID_BLUEPRINT_FRAGMENT)
    need_name_reward.append(CfgResDefField.ResId.RES_ID_TECH_ITEM)
    need_name_reward.append(CfgResDefField.ResId.RES_ID_CLIENT_ICON)
    need_name_reward.append(CfgResDefField.ResId.RES_ID_TITLE_TIME_LIMIT)
    need_name_reward.append(CfgResDefField.ResId.RES_ID_PAPER_BOOK)
    need_name_reward.append(CfgResDefField.ResId.RES_ID_COLLECTION_ITEM_LIMIT)
    need_name_reward.append(CfgResDefField.ResId.RES_ID_TERRAFORM_POINT)
    need_name_reward.append(CfgResDefField.ResId.RES_ID_WEAPON_TECH_PACK)
    need_name_reward.append(CfgResDefField.ResId.RES_ID_BATTLE_PASS_SELECT_REWARD)
    need_name_reward.append(CfgResDefField.ResId.RES_ID_CFG_MAP_QUICK_NEWS)
    need_name_reward.append(CfgResDefField.ResId.RES_ID_PEAK_AUTH_ITEM)
    need_name_reward.append(CfgResDefField.ResId.RES_ID_VOICE_STYLE)
    return need_name_reward
