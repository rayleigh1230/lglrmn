# Source Generated with Decompyle++
# File: get_old_npc_team_massive_escort_info.pyc (Python 3.11)

if not team_record:
    return (False, 0)
if not None(team_record[TeamField.UNION_ID]):
    return (False, 0)
if None[TeamField.TEAM_TYPE] == TeamField.Type.TYPE_TRACES:
    return (False, 0)
TeamDataMgr = TeamDataMgr
import data_manager.team_data_mgr
escort_team_id = TeamDataMgr().get_old_npc_team_massive_escort_team_id(team_record)
if escort_team_id:
    return (False, 0)
if not None().get_record(TableID.TEAM, escort_team_id):
    return (False, 0)
return (None, escort_team_id)
