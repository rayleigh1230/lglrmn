# Source Generated with Decompyle++
# File: get_sp_bp_research_tree_pack_feature_info.pyc (Python 3.11)

data = { }
if not sp_bp_pack_id:
    return data
sp_pack_record = None.get(sp_bp_pack_id)
if not sp_pack_record:
    return data
feature_str = None[Tb_cfg_bp_research_tree_pack_sp.FEATURE]
feature_info_lst = feature_str.split(';')
for feature_info in feature_info_lst:
    if not feature_info:
        continue
    if ',' in feature_info:
        detail_lst = feature_info.split(',')
        if len(detail_lst) > 1:
            data[int(detail_lst[0])] = detail_lst[1:]()
            continue
        data[int(detail_lst[0])] = []
        continue
    data[int(feature_info)] = []
    return data
