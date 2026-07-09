# Source Generated with Decompyle++
# File: _handle_grouped_dungeon_world_item_update.pyc (Python 3.11)

for _, update_record, old_record in grouped_data:
    full_record = GameDataMgr().get_record(TableID.DUNGEON_WORLD_ITEM, update_record[DungeonWorldItemField.ID])
    world_item_id = full_record[DungeonWorldItemField.WORLD_ITEM_ID]
    world_item_record = GameDataMgr().get_record(TableID.WORLD_ITEM, world_item_id)
    if not world_item_record:
        continue
    dungeon_id = full_record[DungeonWorldItemField.DUNGEON_INSTANCE_ID]
    self.get_dungeon_world_item_block_index(dungeon_id).delete_item(world_item_id)
    world_item_record = GameDataMgr().get_record(TableID.WORLD_ITEM, world_item_id)
    self._handle_world_item_insert(world_item_record)
    return None
