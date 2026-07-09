# Source Generated with Decompyle++
# File: get_has_l4_data_res.pyc (Python 3.11)

cfg_orb = map_utils.get_city_cfg_orb_by_item_id(meta_cfg_id)
if cfg_orb:
    cfg_res_list = parse_cfg_str_to_list_of_list(cfg_orb[Tb_cfg_orb.RES], is_num = True)
    for res in cfg_res_list:
        if res[0] in (CfgResDefField.ResId.RES_ID_L4_DATA_ORE, CfgResDefField.ResId.RES_ID_L4_DATA):
            return True
        return False
