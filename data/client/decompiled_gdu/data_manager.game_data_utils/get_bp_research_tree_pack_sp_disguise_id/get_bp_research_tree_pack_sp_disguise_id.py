# Source Generated with Decompyle++
# File: get_bp_research_tree_pack_sp_disguise_id.pyc (Python 3.11)

record = Tb_cfg_bp_research_tree_pack_sp.get(res_id)
if record:
    features = parse_cfg_str_to_list_of_list(record[Tb_cfg_bp_research_tree_pack_sp.FEATURE], True)
    for feature in features:
        if feature[0] == CfgBpPackFeatureField.Feature.FEATURE_FAKE:
            
            return None, feature[1]
        return res_id
