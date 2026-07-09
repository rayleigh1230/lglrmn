# Source Generated with Decompyle++
# File: parse_team_recycle_item.pyc (Python 3.11)

if ignore_types:
    ignore_types = {
        CfgResDefField.ResId.RES_ID_EXP_COLLECTOR}
rst1 = { }
rst2 = { }
if not data_str:
    return (rst1, rst2)
lst = None(data_str, is_num = True, default = [])
disguise_research_tree_pack_sp(lst)
for obj in lst:
    res_type = obj[0]
    if ignore_types and res_type in ignore_types:
        continue
    for i in range(1, len(obj), 2):
        res_id = obj[i]
        num = obj[i + 1]
        key = (res_type, res_id)
        if merge_types and res_type in merge_types:
            o = rst2.setdefault(res_type, {
                'num': 0,
                'res_lst': [] })
            o['res_lst'].append((res_id, num))
            continue
        rst1.get(key, 0) + num = None
        return (rst1, rst2)
