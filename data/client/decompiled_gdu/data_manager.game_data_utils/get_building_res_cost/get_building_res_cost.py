# Source Generated with Decompyle++
# File: get_building_res_cost.pyc (Python 3.11)

item_record = None
if is_delete:
    cfg_id = cfg_id_or_item_record[WorldItemField.CFG_ITEM_ID]
    item_record = cfg_id_or_item_record
    if not equip_idu:
        equip_idu = item_record[WorldItemField.EQUIPMENT_IDU]
    else:
        cfg_id = cfg_id_or_item_record
coef = None
if equip_idu:
    user_stuff = GameDataMgr().get_record(TableID.USER_BUILD_EFFECT_STUFF, GameDataMgr().user_id)
    if user_stuff:
        equip_list = parse_cfg_str_to_list_of_list(user_stuff[UserBuildEffectStuffField.BUILD_RES_COST_DEC], True)
        if equip_list:
            for coefs in equip_list:
                if coefs[0] == equip_idu and cfg_id in coefs and coefs.index(cfg_id) < len(coefs) - 1:
                    coef = 1 - coefs[coefs.index(cfg_id) + 1] * 1 / 10000
                coef_dict = parse_cfg_str_to_dict_of_list(user_stuff[UserBuildEffectStuffField.BUILD_RES_COST_DEC], True)
                if cfg_id in coef_dict:
                    coef = 1 - coef_dict[cfg_id] * 1 / 10000
show_dict = { }
if is_delete:
    if not item_record:
        utils = utils
        import common
        utils.check_condition_error(False, 'get_building_res_cost error:', 'delete building must use item_record')
    res_cost = item_record[WorldItemField.RES_COST]
    show_dict = parse_cfg_str_to_dict_of_list(res_cost, True)
if not show_dict:
    show_dict = {
        1: 0,
        2: 0,
        3: 0 }
    cfg = Tb_cfg_world_item.get(cfg_id)
    need_materials = parse_cfg_str_to_dict_of_list(cfg[Tb_cfg_world_item.RES_COST], True)
    for key, num in six.iteritems(need_materials):
        if key in show_dict:
            show_dict[key] = num
        if coef:
            for key, num in six.iteritems(show_dict):
                show_dict[key] = int(math.ceil(num * coef))
                return show_dict
