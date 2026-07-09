# Source Generated with Decompyle++
# File: _handle_grouped_dungeon_world_item_insert.pyc (Python 3.11)

for _, dungeon_world_item_record in grouped_data:
    world_item_id = dungeon_world_item_record[DungeonWorldItemField.WORLD_ITEM_ID]
    world_item_record = GameDataMgr().get_record(TableID.WORLD_ITEM, world_item_id)
    if not world_item_record:
        continue
    dungeon_id = dungeon_world_item_record[DungeonWorldItemField.DUNGEON_INSTANCE_ID]
    world_item_pos = world_item_record[WorldItemField.POS]
    grid_idx_g2 = map_utils.wid_to_index_g2(world_item_pos)
    self.get_dungeon_world_item_block_index(dungeon_id).insert_item(grid_idx_g2, world_item_id)
    return None
