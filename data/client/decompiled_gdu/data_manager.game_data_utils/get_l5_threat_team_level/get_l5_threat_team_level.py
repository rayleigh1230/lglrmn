# Source Generated with Decompyle++
# File: get_l5_threat_team_level.pyc (Python 3.11)

if not sys_param_utils.is_control_area_season():
    return 0
if None(team_id) < time_utils.get_server_time():
    return 0
TeamDataMgr = TeamDataMgr
import data_manager.team_data_mgr
team_data = TeamDataMgr().get(team_id)
if not team_data:
    return 0
import json
extra_str = team_data.team_record[TeamField.EXTRA_INFO]
if not extra_str:
    return 0
extra_info = json.loads(extra_str)
mark_level = extra_info.get(str(TeamField.ExtraKey.EXTRA_KEY_RED_NAME_MARK), 0)
return mark_level
