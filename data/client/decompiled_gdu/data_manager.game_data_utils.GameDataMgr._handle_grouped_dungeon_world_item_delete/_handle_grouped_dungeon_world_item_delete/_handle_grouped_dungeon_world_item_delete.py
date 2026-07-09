# Source Generated with Decompyle++
# File: _handle_grouped_dungeon_world_item_delete.pyc (Python 3.11)

for _, _id, dungeon_world_item_record in grouped_data:
    world_item_id = dungeon_world_item_record[DungeonWorldItemField.WORLD_ITEM_ID]
    dungeon_id = dungeon_world_item_record[DungeonWorldItemField.DUNGEON_INSTANCE_ID]
    self.get_dungeon_world_item_block_index(dungeon_id).delete_item(world_item_id)
    return None
