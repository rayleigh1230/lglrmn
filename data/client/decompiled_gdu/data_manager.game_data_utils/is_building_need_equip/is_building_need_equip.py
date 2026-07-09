# Source Generated with Decompyle++
# File: is_building_need_equip.pyc (Python 3.11)

cfg = Tb_cfg_world_item.get(building_cfg_id)
world_item_type = cfg[Tb_cfg_world_item.WORLD_ITEM_TYPE]
return world_item_type in (WorldItemField.Type.TYPE_DEPOT_LARGE, WorldItemField.Type.TYPE_DEPOT_QUICKLY, WorldItemField.Type.TYPE_DEPOT_WEAPON)
