# Source Generated with Decompyle++
# File: get_sp_bp_research_tree_pack_info_list.pyc (Python 3.11)

Tb_cfg_bp_research_tree_pack_sp = Tb_cfg_bp_research_tree_pack_sp
import common.config.db
ret_list = []
if sp_bp_pack_id:
    record = Tb_cfg_bp_research_tree_pack_sp.get(sp_bp_pack_id)
    if record:
        disguise_record = get_bp_research_tree_pack_sp_record(sp_bp_pack_id)
        pack_id = disguise_record[Tb_cfg_bp_research_tree_pack_sp.PACK_ID]
        features = parse_cfg_str_to_list_of_list(record[Tb_cfg_bp_research_tree_pack_sp.FEATURE], True)
        param_list = parse_cfg_str_to_list_of_list(record[Tb_cfg_bp_research_tree_pack_sp.PARAM], True)
        for idx, feature in enumerate(features):
            feature_id = feature[0]
            param = param_list[idx] if param_list and len(param_list) > idx else None
            ret_list.append([
                pack_id,
                feature_id,
                param])
            return ret_list
