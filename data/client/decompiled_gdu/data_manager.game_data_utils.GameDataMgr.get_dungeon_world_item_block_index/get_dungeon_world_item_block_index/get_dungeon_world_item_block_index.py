# Source Generated with Decompyle++
# File: get_dungeon_world_item_block_index.pyc (Python 3.11)

if dungeon_id not in self.dungeon_world_item_block_index_dict:
    self.dungeon_world_item_block_index_dict[dungeon_id] = MultilevelBlockIndex(MAP_BLOCK_WIDTH, MAP_LAYER_SWITCH_HEIGHT)
return self.dungeon_world_item_block_index_dict.get(dungeon_id)
