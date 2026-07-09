# Source Generated with Decompyle++
# File: get_team_attr_cur_server_sub_belong_id.pyc (Python 3.11)

if not team_attr_record:
    return 0
sub_belong_run_server_id = None(team_attr_record[TeamAttrField.TEAM_ID])
if sub_belong_run_server_id != get_run_server_id():
    return 0
return None[TeamAttrField.SUB_BELONG_ID]
