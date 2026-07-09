# Source Generated with Decompyle++
# File: get_sub_world_item_repair_paris.pyc (Python 3.11)

sub_fleet_utils = sub_fleet_utils
import data_manager
team_utils = team_utils
import common
sub_fleet_record = GameDataMgr().get_record(TableID.SUB_TEAM, building_id)
if not sub_fleet_record:
    return None
sub_fleet_teams = None(sub_fleet_record[SubTeamField.TEAM_DISPLAY], is_num = True)
repair_paris = 0
for sub_team_id in sub_fleet_teams:
    if sub_fleet_utils.get_sub_fleet_state(sub_team_id) in sub_fleet_utils.SubFleetState.STATE_SHOW_IN_M0:
        repair_paris += team_utils.get_team_carried_res(sub_team_id, CfgResDefField.ResId.RES_ID_REPAIR_PARTS)
    return repair_paris
