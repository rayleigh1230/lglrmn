# Source Generated with Decompyle++
# File: get_player_base_building_region.pyc (Python 3.11)

world_item_table = GameDataMgr().get_table(TableID.WORLD_ITEM)
self_user_id = GameDataMgr().user_id
for building_id, record in six.iteritems(world_item_table):
    if record[WorldItemField.USERID] == self_user_id and record[WorldItemField.ITEM_TYPE] == WorldItemField.Type.TYPE_PLAYER_BASE:
        wid = record[WorldItemField.POS]
        grid_idx_g3 = map_utils.wid_to_index_g3(wid)
        
        return None, map_utils.get_map_region_id(grid_idx_g3)
    return None
