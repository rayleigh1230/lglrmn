# Source Generated with Decompyle++
# File: get_building_type_in_show.pyc (Python 3.11)

if is_npc_stargate_building(building_id):
    return WorldItemField.Type.TYPE_NPC_STARGATE
building_record = None().get_record(TableID.WORLD_ITEM, building_id)
if building_record:
    return building_record[WorldItemField.ITEM_TYPE]
