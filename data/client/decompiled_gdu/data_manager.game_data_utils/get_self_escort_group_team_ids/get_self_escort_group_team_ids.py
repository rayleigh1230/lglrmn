# Source Generated with Decompyle++
# File: get_self_escort_group_team_ids.pyc (Python 3.11)

if is_cross:
    return get_self_cross_escort_group_team_ids(team_record)
if not None:
    return None
team_id = None[TeamField.TEAM_ID]
(is_escort, target_team_id, escort_team_ids) = get_team_escort_info(team_record)
if not is_escort:
    return None
group_team_ids = None
if target_team_id:
    group_team_ids.append(target_team_id)
    target_team_record = GameDataMgr().get_record(TableID.TEAM, target_team_id)
    if target_team_record or target_team_record[TeamField.USERID] != GameDataMgr().user_id:
        return None
    None.append(team_id)
if escort_team_ids:
    group_team_ids.append(team_id)
    for _escort_team_id in escort_team_ids:
        escort_team_record = GameDataMgr().get_record(TableID.TEAM, _escort_team_id)
        if escort_team_record and escort_team_record[TeamField.USERID] == GameDataMgr().user_id:
            group_team_ids.append(_escort_team_id)
        return group_team_ids
