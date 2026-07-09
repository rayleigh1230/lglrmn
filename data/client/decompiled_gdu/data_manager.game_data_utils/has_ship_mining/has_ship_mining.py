# Source Generated with Decompyle++
# File: has_ship_mining.pyc (Python 3.11)

ship_utils = ship_utils
import common
team_dict = ship_utils.get_building_teams(building_id)
for team_record in six.itervalues(team_dict):
    if (team_record[TeamField.STATE] == TeamField.State.STATE_TASK_WAITING_RES or team_record[TeamField.STATE] == TeamField.State.STATE_MOVING) and team_record[TeamField.ACTION] in (TeamField.Action.ACTION_TASK_RES_BACK, TeamField.Action.ACTION_TASK_RES_GO):
        return True
    return False
