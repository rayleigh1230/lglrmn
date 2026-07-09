# Source Generated with Decompyle++
# File: get_io_player_world_item_record_by_team_camp_id.pyc (Python 3.11)

player_user_id = GameDataMgr().user_id
if is_io_team_camp(team_camp_world_item_id, player_user_id):
    world_item_table = GameDataMgr().get_table(TableID.WORLD_ITEM)
    for world_item_id, world_item_record in six.iteritems(world_item_table):
        if world_item_record[WorldItemField.ITEM_TYPE] == WorldItemField.Type.TYPE_PLAYER_BASE and world_item_record[WorldItemField.USERID] == player_user_id:
            
            return None, world_item_record
        return None
