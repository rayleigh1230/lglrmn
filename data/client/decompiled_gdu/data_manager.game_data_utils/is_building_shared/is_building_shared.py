# Source Generated with Decompyle++
# File: is_building_shared.pyc (Python 3.11)

item_record = item_record if item_record else GameDataMgr().get_record(TableID.WORLD_ITEM, item_id)
if item_record:
    return get_bit_info(item_record[WorldItemField.ATTR], WorldItemField.Attr.ATTR_DEPOT_SHARE)
