# Source Generated with Decompyle++
# File: get_self_cross_escort_group_team_ids.pyc (Python 3.11)

if not team_record:
    return None
team_id = None[CcbTeamField.ID]
(is_escort, target_team_id, escort_team_ids) = get_team_escort_info(team_record)
if not is_escort:
    return None
group_team_ids = None
cross_conquer_utils = cross_conquer_utils
import data_manager.cross_conquer
if target_team_id:
    group_team_ids.append(target_team_id)
    target_team_record = cross_conquer_utils.get_cross_item_record(TableID.CCB_TEAM, target_team_id)
    if not target_team_record:
        return None
    group_team_ids[0] = None[CcbTeamField.ID]
    group_team_ids.append(team_id)
if escort_team_ids:
    group_team_ids.append(team_id)
    for _escort_team_id in escort_team_ids:
        escort_team_record = cross_conquer_utils.get_cross_item_record(TableID.CCB_TEAM, _escort_team_id)
        if escort_team_record:
            group_team_ids.append(escort_team_record[CcbTeamField.ID])
        return group_team_ids
