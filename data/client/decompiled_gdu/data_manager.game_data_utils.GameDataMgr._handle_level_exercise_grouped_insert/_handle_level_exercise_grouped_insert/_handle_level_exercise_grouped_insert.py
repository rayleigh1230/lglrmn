# Source Generated with Decompyle++
# File: _handle_level_exercise_grouped_insert.pyc (Python 3.11)

for _, insert_record in grouped_data:
    if insert_record[LevelExerciseField.USERID] != GameDataMgr().user_id:
        continue
    team_id = insert_record[LevelExerciseField.PRIMARY_KEY]
    self._military_drill_npc_team_info_dict[team_id] = self._generate_military_drill_team_info_dict(team_id)
    GameEventManager().notify('[military_drill]level_exercise_team_info_changed')
    GameEventManager().notify('[military_drill]ship_retreat_info_changed', team_id)
    return None
