# Source Generated with Decompyle++
# File: get_station_belong_city.pyc (Python 3.11)

station_cfg = Tb_cfg_meta_world_item.get(item_id)
if not station_cfg:
    return 0
npc_city_id = None[Tb_cfg_meta_world_item.BELONG_NPC_CITY]
npc_record = Tb_cfg_meta_world_item.get(npc_city_id)
if npc_record and npc_record[Tb_cfg_meta_world_item.ITEM_TYPE] not in (WorldItemField.Type.TYPE_NPC_CITY_SINGLE, WorldItemField.Type.TYPE_NPC_CITY, WorldItemField.Type.TYPE_RUINS) and npc_city_id not in GameDataMgr().l4_ruin_city_lst:
    npc_city_id = npc_record[Tb_cfg_meta_world_item.BELONG_NPC_CITY]
return npc_city_id
