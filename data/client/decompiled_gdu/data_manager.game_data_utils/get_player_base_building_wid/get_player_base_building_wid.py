# Source Generated with Decompyle++
# File: get_player_base_building_wid.pyc (Python 3.11)

world_item_table = GameDataMgr().get_table(TableID.WORLD_ITEM)
self_user_id = GameDataMgr().user_id
for building_id, record in six.iteritems(world_item_table):
    if record[WorldItemField.USERID] == self_user_id and record[WorldItemField.ITEM_TYPE] == WorldItemField.Type.TYPE_PLAYER_BASE:
        pos = record[WorldItemField.POS]
        coor = record[WorldItemField.COORDINATE]
        
        return None, (pos, coor)
    return (None, None)
