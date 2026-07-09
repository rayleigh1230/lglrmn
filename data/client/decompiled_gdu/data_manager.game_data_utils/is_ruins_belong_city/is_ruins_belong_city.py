# Source Generated with Decompyle++
# File: is_ruins_belong_city.pyc (Python 3.11)

npc_city_config_id = get_station_belong_city(item_id)
if npc_city_config_id in GameDataMgr().l4_ruin_city_lst:
    return True
belong_record = None().get_record(TableID.WORLD_ITEM, npc_city_config_id)
if belong_record:
    item_type = belong_record[WorldItemField.ITEM_TYPE]
else:
    belong_cfg = Tb_cfg_meta_world_item.get(npc_city_config_id)
    if belong_cfg:
        item_type = belong_cfg[Tb_cfg_meta_world_item.ITEM_TYPE]
    else:
        item_type = None
return item_type == WorldItemField.Type.TYPE_RUINS
