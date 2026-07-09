# Source Generated with Decompyle++
# File: get_universal_team_escort_info.pyc (Python 3.11)

if is_cross:
    return get_cross_universal_team_escort_info(team_record)
if not None:
    return None
team_id = None[TeamField.TEAM_ID]
(is_escort, target_team_id, escort_team_ids) = get_team_escort_info(team_record)
if not is_escort:
    return None
if None:
    target_team_record = GameDataMgr().get_record(TableID.TEAM, target_team_id)
    if target_team_record or target_team_record[TeamField.USERID] != GameDataMgr().user_id:
        return UnivEscortInfo(EscortType.ESCORTING_OTHER, target_team_id, [
            team_id], [
            team_id])
    return None(EscortType.ESCORTING, target_team_id, [
        team_id], [
        target_team_id,
        team_id])
if None:
    self_team_ids = []
    for _escort_team_id in escort_team_ids:
        escort_team_record = GameDataMgr().get_record(TableID.TEAM, _escort_team_id)
        if escort_team_record and escort_team_record[TeamField.USERID] == GameDataMgr().user_id:
            self_team_ids.append(_escort_team_id)
        if self_team_ids:
            return UnivEscortInfo(EscortType.ESCORTED, team_id, self_team_ids, [
                team_id] + self_team_ids)
        return None(EscortType.ESCORTED_OTHER, team_id, escort_team_ids, [
            team_id])
        return None
