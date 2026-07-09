# Source Generated with Decompyle++
# File: get_team_attr_sub_belong_from_run_server_id.pyc (Python 3.11)

record = GameDataMgr().get_record(TableID.TEAM_ATTR, team_id)
if not record:
    return 0
if None[TeamAttrField.SUB_BELONG_ID] == 0:
    return 0
if None[TeamAttrField.SUB_BELONG_FROM_RUN_SERVER_ID] == 0:
    return get_run_server_id()
return None[TeamAttrField.SUB_BELONG_FROM_RUN_SERVER_ID]
