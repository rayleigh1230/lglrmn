# Source Generated with Decompyle++
# File: is_building_in_expand_complete_state.pyc (Python 3.11)

expand_team_id = get_expand_team_id(item_record)
if expand_team_id:
    team_record = GameDataMgr().get_record(TableID.TEAM, expand_team_id)
    team_utils = team_utils
    import common
    return team_utils.is_team_expand_completed(team_record)
