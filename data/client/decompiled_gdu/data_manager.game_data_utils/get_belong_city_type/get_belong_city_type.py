# Source Generated with Decompyle++
# File: get_belong_city_type.pyc (Python 3.11)

meta_item_cfg = Tb_cfg_meta_world_item.get(item_id)
if not meta_item_cfg:
    return None
belong_npc_city_id = None[Tb_cfg_meta_world_item.BELONG_NPC_CITY]
belong_city_meta_item_cfg = Tb_cfg_meta_world_item.get(belong_npc_city_id)
if belong_city_meta_item_cfg:
    city_level = get_npc_city_level(belong_city_meta_item_cfg)
    city_type = get_npc_world_item_type(belong_city_meta_item_cfg[Tb_cfg_meta_world_item.ITEM_TYPE], city_level)
    return city_type
