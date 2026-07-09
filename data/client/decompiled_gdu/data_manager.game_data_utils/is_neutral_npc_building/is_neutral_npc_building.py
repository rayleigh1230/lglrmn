# Source Generated with Decompyle++
# File: is_neutral_npc_building.pyc (Python 3.11)

record = GameDataMgr().get_record(TableID.WORLD_ITEM, building_id)
if not record:
    return False
user_id = None.get(WorldItemField.USERID)
if user_id:
    return False
superior_user_id = None.get(WorldItemField.SUPERIOR_USERID)
if superior_user_id:
    return False
union_id = None.get(WorldItemField.UNION_ID)
if not union_id:
    return True
if None(union_id):
    return False
