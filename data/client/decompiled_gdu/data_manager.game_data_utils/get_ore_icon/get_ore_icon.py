# Source Generated with Decompyle++
# File: get_ore_icon.pyc (Python 3.11)

default_icon = ui_res.ICON_MAP_MATERIALS_DUST_SEL
if cfg_orb:
    cfg_star = Tb_cfg_star.get(item_id)
    if cfg_star:
        cfg_orb = Tb_cfg_star.get_orb_template(cfg_star[Tb_cfg_star.TEMPLATE_ID])
if cfg_orb:
    res = parse_cfg_str_to_dict_of_list(cfg_orb[Tb_cfg_orb.RES], is_num = True)
    if not res:
        return default_icon
    if None(res) == 1:
        res_type = list(res.keys())[0]
        return ResInfo.get_res_icon_storage(res_type)
    return None
