# Source Generated with Decompyle++
# File: get_expand_building_by_team_id.pyc (Python 3.11)

building_table = GameDataMgr().get_table(TableID.WORLD_ITEM)
for record in six.itervalues(building_table):
    if get_expand_team_id(record) == team_id:
        
        return None, record
    return None
