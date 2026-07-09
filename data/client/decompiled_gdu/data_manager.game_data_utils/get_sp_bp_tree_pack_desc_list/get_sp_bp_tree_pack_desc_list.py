# Source Generated with Decompyle++
# File: get_sp_bp_tree_pack_desc_list.pyc (Python 3.11)

desc_list = []
info_list = get_sp_bp_research_tree_pack_info_list(sp_bp_pack_id)
for info in info_list:
    desc = process_research_tree_pack_info(info[1], info[2])
    desc_list.append(desc)
    return desc_list
