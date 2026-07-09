# Source Generated with Decompyle++
# File: _handle_level_exercise_grouped_delete.pyc (Python 3.11)

for _, delete_id, delete_record in grouped_data:
    if delete_record[LevelExerciseField.USERID] != GameDataMgr().user_id:
        continue
    del self._military_drill_npc_team_info_dict[delete_id]
    return None
