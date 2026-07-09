# Source Generated with Decompyle++
# File: get_cross_universal_team_escort_info.pyc (Python 3.11)

if not team_record:
    return None
team_id = None[CcbTeamField.ID]
(is_escort, target_team_id, escort_team_ids) = get_team_escort_info(team_record)
if not is_escort:
    return None
cross_conquer_utils = cross_conquer_utils
import data_manager.cross_conquer
if target_team_id:
    target_team_record = cross_conquer_utils.get_cross_item_record(TableID.CCB_TEAM, target_team_id)
    if not target_team_record:
        return UnivEscortInfo(EscortType.ESCORTING_OTHER, 0, [
            team_id], [
            team_id])
    return None(EscortType.ESCORTING, target_team_record[CcbTeamField.ID], [
        team_id], [
        target_team_record[CcbTeamField.ID],
        team_id])
if None:
    self_team_ids = []
    for _escort_team_id in escort_team_ids:
        escort_team_record = cross_conquer_utils.get_cross_item_record(TableID.CCB_TEAM, _escort_team_id)
        if escort_team_record:
            self_team_ids.append(escort_team_record[CcbTeamField.ID])
        if self_team_ids:
            return UnivEscortInfo(EscortType.ESCORTED, team_id, self_team_ids, [
                team_id] + self_team_ids)
        return None(EscortType.ESCORTED_OTHER, team_id, [], [
            team_id])
        return None
