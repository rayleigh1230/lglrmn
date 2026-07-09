# Source Generated with Decompyle++
# File: get_sp_reward_name.pyc (Python 3.11)

Tb_cfg_blueprint_technical = Tb_cfg_blueprint_technical
Tb_cfg_bp_research_tree_pack = Tb_cfg_bp_research_tree_pack
Tb_cfg_bp_research_tree_pack_sp = Tb_cfg_bp_research_tree_pack_sp
Tb_cfg_exp_collector = Tb_cfg_exp_collector
Tb_cfg_personal_emblem_pic = Tb_cfg_personal_emblem_pic
Tb_cfg_painting = Tb_cfg_painting
Tb_cfg_respack = Tb_cfg_respack
Tb_cfg_ship = Tb_cfg_ship
Tb_cfg_ship_blueprint = Tb_cfg_ship_blueprint
Tb_cfg_weapon_tech = Tb_cfg_weapon_tech
import common.config.db
text = ''
if reward_type == CfgResDefField.ResId.RES_ID_PAINTING:
    config = Tb_cfg_painting.get(res_id)
    text = config[Tb_cfg_painting.NAME]
elif reward_type == CfgResDefField.ResId.RES_ID_WEAPON_TECH:
    config = Tb_cfg_weapon_tech.get(res_id)
    text = config[Tb_cfg_weapon_tech.NAME]
elif reward_type == CfgResDefField.ResId.RES_ID_SHIP_BLUEPRINT:
    bp_config = Tb_cfg_ship_blueprint.get(res_id)
    ship_id = bp_config[Tb_cfg_ship_blueprint.SHIP_ID]
    ship_config = Tb_cfg_ship.get(ship_id)
    text = ship_config[Tb_cfg_ship.SHORT_NAME] if ship_short_name else ship_config[Tb_cfg_ship.NAME]
elif reward_type == CfgResDefField.ResId.RES_ID_SHIP:
    config = Tb_cfg_ship.get(res_id)
    text = config[Tb_cfg_ship.SHORT_NAME] if ship_short_name else config[Tb_cfg_ship.NAME]
elif reward_type == CfgResDefField.ResId.RES_ID_BP_RESEARCH_TREE_PACK:
    config = Tb_cfg_bp_research_tree_pack.get(res_id)
    text = config[Tb_cfg_bp_research_tree_pack.NAME]
elif reward_type == CfgResDefField.ResId.RES_ID_BP_RESEARCH_TREE_PACK_SP:
    sp_bp_config = get_bp_research_tree_pack_sp_record(res_id)
    if sp_bp_config:
        pack_id = sp_bp_config[Tb_cfg_bp_research_tree_pack_sp.PACK_ID]
        config = Tb_cfg_bp_research_tree_pack.get(pack_id)
        if config:
            text = config[Tb_cfg_bp_research_tree_pack.NAME]
        elif reward_type == CfgResDefField.ResId.RES_ID_EMBLEM:
            config = Tb_cfg_personal_emblem_pic.get(res_id)
            text = config[Tb_cfg_personal_emblem_pic.NAME]
        elif reward_type == CfgResDefField.ResId.RES_ID_TITLE:
            config = Tb_cfg_title.get(res_id)
            text = config[Tb_cfg_title.TITLE_NAME]
        elif reward_type == CfgResDefField.ResId.RES_ID_EMBLEM_BG:
            config = Tb_cfg_personal_emblem_bg.get(res_id)
            text = config[Tb_cfg_personal_emblem_bg.NAME]
        elif reward_type == CfgResDefField.ResId.RES_ID_RESPACK:
            config = Tb_cfg_respack.get(res_id)
            text = config[Tb_cfg_respack.NAME]
        elif reward_type == CfgResDefField.ResId.RES_ID_BP_TECHNICAL:
            config = Tb_cfg_blueprint_technical.get(res_id)
            text = config[Tb_cfg_blueprint_technical.NAME]
        elif reward_type == CfgResDefField.ResId.RES_ID_BP_ADDITIONAL_SYS:
            config = Tb_cfg_blueprint_additional_sys.get(res_id)
            text = config[Tb_cfg_blueprint_additional_sys.NAME]
        elif reward_type == CfgResDefField.ResId.RES_ID_EXP_COLLECTOR:
            config = Tb_cfg_exp_collector.get(res_id)
            text = config[Tb_cfg_exp_collector.NAME]
        elif reward_type == CfgResDefField.ResId.RES_ID_PLAYER_SHIP_WRECK:
            config = Tb_cfg_ship.get(res_id)
            text = config[Tb_cfg_ship.SHORT_NAME] if ship_short_name else config[Tb_cfg_ship.NAME]
            text = language.RES_NAME_SHIP_WRECK_FMT.format(text)
        elif reward_type == CfgResDefField.ResId.RES_ID_SELF_SHIP_WRECK:
            config = Tb_cfg_ship.get(res_id)
            text = config[Tb_cfg_ship.SHORT_NAME] if ship_short_name else config[Tb_cfg_ship.NAME]
            text = language.RES_NAME_SHIP_WRECK_FMT.format(text)
        elif reward_type == CfgResDefField.ResId.RES_ID_SHIP_WRECK:
            ship_id = res_id // 10000
            config = Tb_cfg_ship.get(ship_id)
            ship_name = config[Tb_cfg_ship.SHORT_NAME] if ship_short_name else config[Tb_cfg_ship.NAME]
            text = language.RES_NAME_SHIP_WRECK_FMT.format(ship_name)
        elif reward_type == CfgResDefField.ResId.RES_ID_DECORATE_ITEM:
            config = Tb_cfg_decorate_item.get(res_id)
            text = config[Tb_cfg_decorate_item.NAME]
        else:
            text = common_definition.ResInfo.get_res_icon_name(reward_type)
return text
