# Source Generated with Decompyle++
# File: get_player_level_exercise_beacon_id_and_record.pyc (Python 3.11)

user_id = GameDataMgr().user_id
for building_id, record in GameDataMgr().get_table(TableID.WORLD_ITEM).items():
    if record[WorldItemField.USERID] == user_id and record[WorldItemField.ITEM_TYPE] == item_type:
        
        return None, (building_id, record)
    return None
