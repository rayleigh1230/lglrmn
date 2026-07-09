# Source Generated with Decompyle++
# File: _handle_world_item_insert.pyc (Python 3.11)

world_item_id = world_item_record[TableKey[TableID.WORLD_ITEM]]
world_item_pos = world_item_record[WorldItemField.POS]
grid_idx_g2 = map_utils.wid_to_index_g2(world_item_pos)
if world_item_record[WorldItemField.ITEM_TYPE] == WorldItemField.Type.TYPE_DOCK_ITEM:
    self.dock_item_wid_2_cfg_id[world_item_pos] = world_item_record[WorldItemField.CFG_ITEM_ID]
if grid_idx_g2:
    self.world_item_block_index.insert_item(grid_idx_g2, world_item_id)
    return None
None('world item wid error:{} cant match star field range'.format(world_item_pos))
