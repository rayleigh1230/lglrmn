# Source Generated with Decompyle++
# File: res_info_to_show_mine_info.pyc (Python 3.11)

import copy
ret_show_capacity = copy.deepcopy(cur_capacity)
for i in (CfgResDefField.ResId.RES_ID_METAL, CfgResDefField.ResId.RES_ID_CRYSTAL, CfgResDefField.ResId.RES_ID_DEUTERIUM, CfgResDefField.ResId.RES_ID_SPECIAL_MINE, CfgResDefField.ResId.RES_ID_L4_DATA):
    if i in ret_show_capacity:
        res_id = res_id_to_mine_type(i)
        res_record = Tb_cfg_res_def.get(res_id)
        basic_contains = parse_cfg_str_to_list_of_list(res_record[Tb_cfg_res_def.BASIC_CONTAINS], is_num = True)
        res_ratio = basic_contains[0][1]
        ret_show_capacity[res_id] = int(ret_show_capacity[i] * (10000 / float(res_ratio)))
        del ret_show_capacity[i]
    return ret_show_capacity
