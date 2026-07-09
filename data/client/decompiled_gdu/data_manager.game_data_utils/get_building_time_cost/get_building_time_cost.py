# Source Generated with Decompyle++
# File: get_building_time_cost.pyc (Python 3.11)

cfg_id = cfg_id_or_item_record
cfg = Tb_cfg_world_item.get(cfg_id)
coef = None
if equip_idu:
    user_stuff = GameDataMgr().get_record(TableID.USER_BUILD_EFFECT_STUFF, GameDataMgr().user_id)
    if user_stuff:
        equip_list = parse_cfg_str_to_list_of_list(user_stuff[UserBuildEffectStuffField.BUILD_TIME_COST_DEC], True)
        if equip_list:
            for coefs in equip_list:
                if coefs[0] == equip_idu and cfg_id in coefs and coefs.index(cfg_id) < len(coefs) - 1:
                    coef = 1 - coefs[coefs.index(cfg_id) + 1] * 1 / 10000
                need_time = cfg[Tb_cfg_world_item.TIME_COST]
                if coef:
                    need_time = int(math.ceil(need_time * coef))
return need_time
