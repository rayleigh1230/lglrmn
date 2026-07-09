# Source Generated with Decompyle++
# File: get_data_L4_require_storage.pyc (Python 3.11)

cfg_res_def = Tb_cfg_res_def.get(CfgResDefField.ResId.RES_ID_L4_DATA_ORE)
ratio = parse_cfg_str_to_list_of_list(cfg_res_def[Tb_cfg_res_def.BASIC_CONTAINS], is_num = True)[0][1]
return int(math.ceil(10000 / ratio))
