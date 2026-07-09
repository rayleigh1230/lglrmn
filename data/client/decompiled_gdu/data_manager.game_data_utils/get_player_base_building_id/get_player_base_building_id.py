# Source Generated with Decompyle++
# File: get_player_base_building_id.pyc (Python 3.11)

gdm = GameDataMgr()
self_user_id = gdm.user_id
user_record = gdm.get_record(TableID.USER, self_user_id)
if user_record and UserField.MAIN_WID in user_record:
    return user_record[UserField.MAIN_WID]
world_item_table = None.get_table(TableID.WORLD_ITEM)
for building_id, record in six.iteritems(world_item_table):
    if record[WorldItemField.USERID] == self_user_id and record[WorldItemField.ITEM_TYPE] == WorldItemField.Type.TYPE_PLAYER_BASE:
        
        return None, building_id
    return None
