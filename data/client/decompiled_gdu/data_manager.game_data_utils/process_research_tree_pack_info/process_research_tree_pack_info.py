# Source Generated with Decompyle++
# File: process_research_tree_pack_info.pyc (Python 3.11)

Tb_cfg_bp_pack_feature = Tb_cfg_bp_pack_feature
Tb_cfg_ship = Tb_cfg_ship
Tb_cfg_ship_blueprint = Tb_cfg_ship_blueprint
import common.config.db
CfgBpPackFeatureField = CfgBpPackFeatureField
import common.config.table_definition
desc = ''
if feature_id:
    base_desc = Tb_cfg_bp_pack_feature.get(feature_id)[Tb_cfg_bp_pack_feature.DESC]
    if feature_id == CfgBpPackFeatureField.Feature.FEATURE_INCREASE_SPECIFIC_BLUEPRINT_PROB:
        bp_config = Tb_cfg_ship_blueprint.get(parm[0])
        if bp_config:
            ship_id = bp_config[Tb_cfg_ship_blueprint.SHIP_ID]
            ship_config = Tb_cfg_ship.get(ship_id)
            bp_ship_name = ship_config[Tb_cfg_ship.SHORT_NAME]
            desc = base_desc.format(bp_ship_name, parm[1])
        elif feature_id == CfgBpPackFeatureField.Feature.FEATURE_INCREASE_SPECIFIC_TYPE_BP_PROB:
            config = Tb_cfg_ship_type.get(parm[0])
            if config:
                ship_type = config[Tb_cfg_ship_type.SHIP_TYPE]
                desc = base_desc.format(ship_type, parm[1])
            elif feature_id == CfgBpPackFeatureField.Feature.FEATURE_NO_NEED_RESEARCH_TIME:
                desc = base_desc
            elif feature_id == CfgBpPackFeatureField.Feature.FEATURE_THREE_IN_ONE:
                desc = base_desc
            elif feature_id == CfgBpPackFeatureField.Feature.FEATURE_RESEARCH_TIME_LIMITED:
                desc = base_desc.format(parm[0]) if parm else base_desc
            elif feature_id == CfgBpPackFeatureField.Feature.FEATURE_NINE_IN_ONE:
                desc = base_desc
            elif feature_id == CfgBpPackFeatureField.Feature.FEATURE_GUARANTEED_DROP:
                desc = base_desc
            elif feature_id == CfgBpPackFeatureField.Feature.FEATURE_CUSTOM_RESEARCH:
                desc = base_desc
            elif feature_id == CfgBpPackFeatureField.Feature.FEATURE_SPECIALIZED_RESEARCH:
                ship_type_desc = ''
                for ship_type in parm:
                    config = Tb_cfg_ship_type.get(ship_type)
                    if config:
                        ship_type = config[Tb_cfg_ship_type.SHIP_TYPE]
                        ship_type_desc += '{}/'.format(ship_type)
                    desc = base_desc.format(ship_type_desc[:-1])
if feature_id == CfgBpPackFeatureField.Feature.FEATURE_PANGU_WISH_PROB:
    desc = base_desc
else:
    desc = base_desc.format(parm[0])
return desc
