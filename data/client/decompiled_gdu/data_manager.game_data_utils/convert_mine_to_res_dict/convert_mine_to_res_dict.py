# Source Generated with Decompyle++
# File: convert_mine_to_res_dict.pyc (Python 3.11)

result = { }
for mine_id in (CfgResDefField.ResId.RES_ID_METAL_ORE, CfgResDefField.ResId.RES_ID_CRYSTAL_ORE, CfgResDefField.ResId.RES_ID_SPECIAL_MINE_ORE, CfgResDefField.ResId.RES_ID_L4_DATA_ORE, CfgResDefField.ResId.RES_ID_DEUTERIUM_ORE):
    if mine_id in mine_dict:
        cfg_res_def = Tb_cfg_res_def.get(mine_id)
        ratio = parse_cfg_str_to_list_of_list(cfg_res_def[Tb_cfg_res_def.BASIC_CONTAINS])[0][1]
        res_id = get_mineid_to_resid().get(mine_id)
        result[res_id] = float(int(ratio) / 10000) * float(mine_dict.get(mine_id))
    return result
