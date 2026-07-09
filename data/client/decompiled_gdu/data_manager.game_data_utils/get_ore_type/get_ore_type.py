# Source Generated with Decompyle++
# File: get_ore_type.pyc (Python 3.11)

if cfg_orb:
    cfg_star = Tb_cfg_star.get(item_id)
    if cfg_star:
        cfg_orb = Tb_cfg_star.get_orb_template(cfg_star[Tb_cfg_star.TEMPLATE_ID])
if cfg_orb:
    res = parse_cfg_str_to_dict_of_list(cfg_orb[Tb_cfg_orb.RES], is_num = True)
    if not res:
        return None
    if None(res) == 1:
        res_type = list(res.keys())[0]
        return common_definition.RES_TYPE_TO_ASTEROID_TYPE.get(res_type)
    return None.TypeOre.TYPE_MIX
