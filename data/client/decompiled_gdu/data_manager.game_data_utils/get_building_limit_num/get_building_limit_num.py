# Source Generated with Decompyle++
# File: get_building_limit_num.pyc (Python 3.11)

DEPOT_CFG_IDS = DEPOT_CFG_IDS
import common.preprocess_data
STANDARD_DEPOT_CFG_ID = STANDARD_DEPOT_CFG_ID
import common.common_definition
if cfg_id in DEPOT_CFG_IDS:
    cfg_id = STANDARD_DEPOT_CFG_ID
item_cfg = Tb_cfg_world_item.get(cfg_id)
if item_cfg and item_cfg[Tb_cfg_world_item.WORLD_ITEM_TYPE] == WorldItemField.Type.TYPE_FAMILY_WAREHOUSE:
    return FAMILY_LOGISTICS_BUILD_NUM
item_cfg = None.get(cfg_id)
if item_cfg and item_cfg[Tb_cfg_world_item.WORLD_ITEM_TYPE] == WorldItemField.Type.TYPE_GUILD_DOCK:
    return GUILD_DOCK_BUILD_NUM
user_stuff = None().get_record(TableID.USER_STUFF, user_id)
built_limit = user_stuff[UserStuffField.BUILD_LIMIT] if user_stuff else ''
equip_stuff = GameDataMgr().get_record(TableID.USER_BUILD_EFFECT_STUFF, user_id)
equip_limit = equip_stuff[UserBuildEffectStuffField.BUILD_LIMIT] if equip_stuff else ''
limit_from_stuff = { }
if built_limit:
    limit_from_stuff = parse_cfg_str_to_dict_of_list(built_limit, is_num = True)
equip_limit_num = 0
if equip_limit:
    equip_limit_num = 0
    limit_from_equip = parse_cfg_str_to_dict_of_dict(equip_limit, is_num = True)
    for equip_id in limit_from_equip:
        for _cfg_id in limit_from_equip[equip_id]:
            if _cfg_id == cfg_id:
                if equip_id_u:
                    if equip_id_u == equip_id:
                        equip_limit_num += limit_from_equip[equip_id][_cfg_id]
                    continue
                equip_limit_num += limit_from_equip[equip_id][_cfg_id]
            return limit_from_stuff.get(cfg_id, 0) + equip_limit_num
