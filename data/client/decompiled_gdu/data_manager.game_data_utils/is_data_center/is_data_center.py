# Source Generated with Decompyle++
# File: is_data_center.pyc (Python 3.11)

item_record = GameDataMgr().get_record(TableID.WORLD_ITEM, building_id)
if item_record:
    return map_utils.is_world_item_has_data(item_record[WorldItemField.CFG_ITEM_ID])
