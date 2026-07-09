# Source Generated with Decompyle++
# File: get_bp_research_tree_pack_sp_record.pyc (Python 3.11)

if with_disguise:
    disguise_id = get_bp_research_tree_pack_sp_disguise_id(res_id)
    record = Tb_cfg_bp_research_tree_pack_sp.get(disguise_id)
else:
    record = Tb_cfg_bp_research_tree_pack_sp.get(res_id)
return record
