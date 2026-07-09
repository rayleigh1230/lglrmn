# Source Generated with Decompyle++
# File: _handle_level_exercise_grouped_update.pyc (Python 3.11)

LEVEL_EXERCISE_FINISHED_STATS = LEVEL_EXERCISE_FINISHED_STATS
import ui.military_drill_view.level_exercise_utils
for _, update_record, replace_record in grouped_data:
    need_update = False
    for field in (LevelExerciseField.RECORDS, LevelExerciseField.FRIENDLY_RECORDS, LevelExerciseField.CONVERGING_MONSTER, LevelExerciseField.FRIENDLY_CONVERGING_MONSTER, LevelExerciseField.ATTACK_TARGET, LevelExerciseField.CACHE_RETREAT_INFO):
        if field in update_record:
            need_update = True
        
        if not need_update:
            continue
    team_id = update_record[LevelExerciseField.PRIMARY_KEY]
    full_record = GameDataMgr().get_record(TableID.LEVEL_EXERCISE, team_id)
    if full_record[LevelExerciseField.USERID] != GameDataMgr().user_id:
        continue
    if full_record[LevelExerciseField.STATE] in LEVEL_EXERCISE_FINISHED_STATS:
        continue
    self._military_drill_npc_team_info_dict[team_id] = self._generate_military_drill_team_info_dict(team_id)
    GameEventManager().notify('[military_drill]level_exercise_team_info_changed')
    if LevelExerciseField.CACHE_RETREAT_INFO in update_record:
        GameEventManager().notify('[military_drill]ship_retreat_info_changed', team_id)
continue
