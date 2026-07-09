# Source Generated with Decompyle++
# File: get_res_reserve_by_res.pyc (Python 3.11)

rst = { }
ratio_dic = parse_cfg_str_to_dict_of_list(res, is_num = True)
for mineid in (CfgResDefField.ResId.RES_ID_METAL_ORE, CfgResDefField.ResId.RES_ID_CRYSTAL_ORE, CfgResDefField.ResId.RES_ID_DEUTERIUM_ORE, CfgResDefField.ResId.RES_ID_SPECIAL_MINE_ORE, CfgResDefField.ResId.RES_ID_L4_DATA_ORE):
    if mineid not in ratio_dic:
        continue
    if count <= 0:
        rst[mineid] = 0
        continue
    ratio = ratio_dic[mineid]
    res_def_cfg = Tb_cfg_res_def.get(mineid)
    basic_contains = parse_cfg_str_to_list_of_list(res_def_cfg[Tb_cfg_res_def.BASIC_CONTAINS], is_num = True)[0][1]
    rst[mineid] = (count * ratio / 10000) * basic_contains / 10000
    return rst
