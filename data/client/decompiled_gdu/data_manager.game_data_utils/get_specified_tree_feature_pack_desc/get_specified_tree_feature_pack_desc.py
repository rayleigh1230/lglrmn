# Source Generated with Decompyle++
# File: get_specified_tree_feature_pack_desc.pyc (Python 3.11)

cfg_gameplay_tips = cfg_gameplay_tips
import common.config.client_cfg
Tb_cfg_bp_pack_feature = Tb_cfg_bp_pack_feature
import common.config.db
CfgBpPackFeatureField = CfgBpPackFeatureField
import common.config.table_definition
desc = ''
feature_id_info = get_sp_bp_research_tree_pack_feature_info(sp_bp_pack_id)
if not feature_id_info:
    return desc
is_short_desc = None(sp_feature_id)
if is_short_desc:
    if sp_feature_id not in list(feature_id_info.keys()):
        return desc
    base_desc = None.get(sp_feature_id)[Tb_cfg_bp_pack_feature.DESC]
    if sp_feature_id == CfgBpPackFeatureField.Feature.FEATURE_RESEARCH_TIME_LIMITED:
        parm = feature_id_info[sp_feature_id]
        desc = base_desc.format(parm[0]) if parm else base_desc
    elif sp_feature_id == CfgBpPackFeatureField.Feature.FEATURE_SPECIFIED_TREE:
        desc = base_desc
    elif CfgBpPackFeatureField.Feature.FEATURE_SPECIFIED_TREE in list(feature_id_info.keys()):
        tips_id = 326 if not show_detail_cost else 337
    elif CfgBpPackFeatureField.Feature.FEATURE_RESEARCH_TIME_LIMITED in list(feature_id_info.keys()):
        tips_id = 327
    else:
        tips_id = 0
if tips_id:
    desc = cfg_gameplay_tips.get(tips_id)[cfg_gameplay_tips.DESC]
return desc
