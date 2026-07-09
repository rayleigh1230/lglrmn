# Source Generated with Decompyle++
# File: dbg_plot_military_drill_data.pyc (Python 3.11)

if not common_config.is_dev_mode():
    return None
for self_team_id, team_info_dict in None._military_drill_npc_team_info_dict.items():
    print('team_id = {}'.format(self_team_id))
    level_exercise_record = GameDataMgr().get_record(TableID.LEVEL_EXERCISE, self_team_id)
    print('level_cfg_id = {}'.format(level_exercise_record[LevelExerciseField.LEVEL_ID]))
    for team_id, team_info in team_info_dict.items():
        print('\t {} - {} - {}'.format(team_id, team_info.level_exercise_monster_cfg_id, team_info.round_idx))
        return None
