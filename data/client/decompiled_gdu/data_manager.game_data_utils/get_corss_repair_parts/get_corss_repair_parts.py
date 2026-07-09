# Source Generated with Decompyle++
# File: get_corss_repair_parts.pyc (Python 3.11)

sub_base_set = set()
sub_team_table = GameDataMgr().get_table(TableID.SUB_TEAM)
for sub_team_record in six.itervalues(sub_team_table):
    if sub_team_record[SubTeamField.USERID] != GameDataMgr().user_id:
        continue
    if sub_team_record[SubTeamField.ACTIVE] == SubTeamField.Active.ACTIVE_ON and sub_team_record[SubTeamField.WORLD_ITEM_ID]:
        sub_base_set.add(sub_team_record[SubTeamField.ID])
    cur_module_num = 0
    add_module_speed = 0
    max_module_num = 0
    for sub_base_id in sub_base_set:
        (module_num, module_speed, max_module) = get_current_repair_parts(sub_base_id, True)
        cur_module_num += module_num
        add_module_speed += module_speed
        max_module_num += max_module
        return (cur_module_num, add_module_speed, max_module_num)
