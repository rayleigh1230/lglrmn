# Source Generated with Decompyle++
# File: disguise_research_tree_pack_sp.pyc (Python 3.11)

temp_dict = { }
for data in data_list:
    res_type = data[0]
    if res_type == CfgResDefField.ResId.RES_ID_BP_RESEARCH_TREE_PACK_SP:
        for idx in range(1, len(data), 2):
            res_id = data[idx]
            res_num = data[idx + 1]
            disguise_id = get_bp_research_tree_pack_sp_disguise_id(res_id)
            temp_dict[disguise_id] = temp_dict.get(disguise_id, 0) + res_num
            del data[1:]
            for x, y in six.iteritems(temp_dict):
                data += [
                    x,
                    y]
                return None
