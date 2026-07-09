# Source Generated with Decompyle++
# File: get_ccb_team_sub_belong_from_run_server_id.pyc (Python 3.11)

record = GameDataMgr().get_record(TableID.CCB_TEAM, team_id)
if not record:
    return 0
if None[CcbTeamField.SUB_BELONG_ID] == 0:
    return 0
if None[CcbTeamField.SUB_BELONG_FROM_RUN_SERVER_ID] == 0:
    return record[CcbTeamField.FROM_RUN_SERVER_ID]
return None[CcbTeamField.SUB_BELONG_FROM_RUN_SERVER_ID]
