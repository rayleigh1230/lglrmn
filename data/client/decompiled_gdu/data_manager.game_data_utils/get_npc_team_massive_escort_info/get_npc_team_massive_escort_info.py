# Source Generated with Decompyle++
# File: get_npc_team_massive_escort_info.pyc (Python 3.11)

if not team_record:
    return (False, 0, 0)
if None(team_record[TeamField.UNION_ID]) and team_record[TeamField.TEAM_TYPE] != TeamField.Type.TYPE_TRACES:
    TeamDataMgr = TeamDataMgr
    import data_manager.team_data_mgr
    team_id = team_record[TeamField.TEAM_ID]
    team_ids = TeamDataMgr().get_npc_team_massive_escort_team_ids(team_record)
    if team_ids or team_id not in team_ids:
        return (False, 0, 0)
    None.sort()
    if team_id == team_ids[-1]:
        next_team_id = team_ids[0]
    else:
        next_team_id = team_ids[1 + team_ids.index(team_id)]
    return (True, next_team_id, team_ids)
