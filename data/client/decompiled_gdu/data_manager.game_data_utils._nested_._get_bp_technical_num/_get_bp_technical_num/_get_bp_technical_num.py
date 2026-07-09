# Source Generated with Decompyle++
# File: _get_bp_technical_num.pyc (Python 3.11)

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
