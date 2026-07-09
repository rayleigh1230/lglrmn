# Source Generated with Decompyle++
# File: is_custom_research_pack.pyc (Python 3.11)

Tb_cfg_bp_research_tree_pack_sp = Tb_cfg_bp_research_tree_pack_sp
import common.config.db
if sp_bp_pack_id:
    record = Tb_cfg_bp_research_tree_pack_sp.get(sp_bp_pack_id)
    if record:
        features = parse_cfg_str_to_list_of_list(record[Tb_cfg_bp_research_tree_pack_sp.FEATURE], True)
        for idx, feature in enumerate(features):
            if feature[0] == CfgBpPackFeatureField.Feature.FEATURE_CUSTOM_RESEARCH:
                return True
            return False
