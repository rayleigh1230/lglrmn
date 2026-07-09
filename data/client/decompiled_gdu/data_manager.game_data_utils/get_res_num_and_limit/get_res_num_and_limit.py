# Source Generated with Decompyle++
# File: get_res_num_and_limit.pyc (Python 3.11)

blueprint_utils = blueprint_utils
import common
res_max = get_max_user_res()
user_res = get_estimate_user_res()

def _get_cur_respack_num():
    cur_respack_num = 0
    respack_table = GameDataMgr().get_table(TableID.USER_RESPACK)
    self_user_id = GameDataMgr().user_id
    for record in six.itervalues(respack_table):
        if record[UserRespackField.USERID] == self_user_id:
            cur_respack_num += 1
        return cur_respack_num


def _get_bp_technical_num(cfg_id):
    bp_tech_cfg = Tb_cfg_blueprint_technical.get(cfg_id)
    if bp_tech_cfg:
        game_play = data_utils.parse_cfg_str_to_list(bp_tech_cfg[Tb_cfg_blueprint_technical.GAME_PLAY], True)
        if len(game_play) > 1 and game_play[1] == CfgGameplaySceneField.SceneId.SCENE_ID_PERPETUAL_WARZONE:
            return None
        cur_num = None
        bp_tech_table = GameDataMgr().get_table(TableID.BLUEPRINT_TECHNICAL)
        for bp_tech_idu, bp_tech_record in six.iteritems(bp_tech_table):
            if bp_tech_record[BlueprintTechnicalField.CFG_BP_TECHNICAL_ID] == cfg_id:
                cur_num += bp_tech_record[BlueprintTechnicalField.COUNT]
            return cur_num

res_num_dict = { }
for res_type in res_dic:
    res_data = res_dic[res_type]
    cur_num = user_res.get(res_type, None)
    res_max_num = res_max.get(res_type, None)
    if res_max_num or cur_num:
        res_num_dict[res_type] = (cur_num, res_max_num)
        continue
    if CfgResDefField.ResId.RES_ID_WEAPON_TECH == res_type:
        cfg_tech_id = res_data[2] if len(res_data) > 2 else res_data[1]
        cur_num = blueprint_utils.get_weapon_tech_have(cfg_tech_id)
        res_max_num = configdata.WEAPON_TECH_LIMIT
    elif CfgResDefField.ResId.RES_ID_BP_RESEARCH_TREE_PACK == res_type:
        cur_num = get_cur_tree_pack_num()
        res_max_num = configdata.BLUEPRINT_RESEARCH_TREE_PACK_LIMIT
    elif CfgResDefField.ResId.RES_ID_BLUEPRINT_TECH_RESET == res_type:
        cfg_id = res_data[2] if len(res_data) > 2 else res_data[1]
        cfg_record = Tb_cfg_blueprint_tech_reset.get(cfg_id)
        if cfg_record:
            cur_reset_type = cfg_record[Tb_cfg_blueprint_tech_reset.RESET_TYPE]
            (reset_tech_num_dict, _, _) = blueprint_utils.get_reset_tech_info()
            cur_num = reset_tech_num_dict.get(cur_reset_type, 0)
        elif CfgResDefField.ResId.RES_ID_RESEARCH_POINT_RESERVE == res_type:
            cur_num = get_user_research_point_reserve_value()
        elif CfgResDefField.ResId.RES_ID_REPAIR_PARTS == res_type:
            building_id = get_player_base_building_id()
            (current_repairs, add_repairs, max_repairs) = get_current_repair_parts(building_id, get_extra_info = True)
            cur_num = current_repairs
            res_max_num = max_repairs
        elif CfgResDefField.ResId.RES_ID_RESPACK == res_type:
            cur_num = _get_cur_respack_num()
            res_max_num = configdata.RES_PACK_CAPACITY
        elif CfgResDefField.ResId.RES_ID_SEASON_SCORE == res_type:
            cur_num = get_user_season_score_value()
        elif CfgResDefField.ResId.RES_ID_BP_TECHNICAL == res_type:
            cfg_tech_id = res_data[2] if len(res_data) > 2 else res_data[1]
            cur_num = _get_bp_technical_num(cfg_tech_id)
        elif CfgResDefField.ResId.RES_ID_EXP_COLLECTOR == res_type:
            cfg_exp_id = res_data[2] if len(res_data) > 2 else res_data[1]
            cur_num = blueprint_utils.get_exp_collector_num_by_cfg_id(cfg_exp_id)
        elif CfgResDefField.ResId.RES_ID_NPC_TEAM_EFFECT == res_type:
            ship_utils = ship_utils
            import common
            res_id = res_data[2] if len(res_data) > 2 else res_data[1]
            if res_id:
                ship_id = get_ship_id_by_npc_team_effect_id(res_id)
                bp_id = blueprint_utils.get_bp_cfg_id(ship_id)
                ship_list = get_ship_list_by_bp_id(bp_id)
                cur_num = len(ship_list)
                res_max_num = ship_utils.get_ship_blueprint_max_num(ship_id)
            elif CfgResDefField.ResId.RES_ID_NORMA_SCORE == res_type:
                cur_num = get_user_norma_score_value()
            elif CfgResDefField.ResId.RES_ID_PROXIMA_COIN == res_type:
                cur_num = get_user_proxima_coin_value()
            elif CfgResDefField.ResId.RES_ID_YUAN_BAO == res_type:
                cur_num = get_user_chu_coin_value()
            elif CfgResDefField.ResId.RES_ID_MILITARY_PRESTIGE_POINT == res_type:
                bounty_data_utils = bounty_data_utils
                import data_manager.bounty
                cur_num = bounty_data_utils.get_cur_military_prestige_point()
if res_max_num or cur_num:
    res_num_dict[res_type] = (cur_num, res_max_num)
continue
return res_num_dict
