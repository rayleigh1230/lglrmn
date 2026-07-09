# Source Generated with Decompyle++
# File: _generate_military_drill_team_info_dict.pyc (Python 3.11)

game_data_utils = game_data_utils
import data_manager
level_exercise_record = GameDataMgr().get_record(TableID.LEVEL_EXERCISE, in_military_drill_team_id)
team_info_dict = { }
if not level_exercise_record:
    return team_info_dict
Tb_cfg_level_exercise = Tb_cfg_level_exercise
import common.config.db
Tb_cfg_level_exercise_round = Tb_cfg_level_exercise_round
import common.config.db
level_id = level_exercise_record[LevelExerciseField.LEVEL_ID]
level_exercise_cfg = Tb_cfg_level_exercise.get(level_id)
monster_id_to_round_idx_dict = { }
monster_id_to_round_id_dict = { }
round_id_list = game_data_utils.parse_cfg_str_to_list(level_exercise_cfg[Tb_cfg_level_exercise.ROUNDS], is_num = True, default = [])
for round_idx, round_id in enumerate(round_id_list):
    round_cfg = Tb_cfg_level_exercise_round.get(round_id)
    monster_lst = game_data_utils.parse_cfg_str_to_list(round_cfg[Tb_cfg_level_exercise_round.MONSTERS], is_num = True, default = [])
    monster_lst.extend(game_data_utils.parse_cfg_str_to_list(round_cfg[Tb_cfg_level_exercise_round.FRIENDLY_MONSTERS], is_num = True, default = []))
    for monster_id in monster_lst:
        monster_id_to_round_idx_dict[monster_id] = round_idx
        monster_id_to_round_id_dict[monster_id] = round_id
        
        def _add_team_info(_team_id = None, target_team_id = None, is_friendly = None, _level_exercise_monster_cfg_id = None, _retreat_ship_info_dict = None):
            if _retreat_ship_info_dict:
                _retreat_ship_info_dict = { }
            if _team_id in team_info_dict:
                return None
            team_info = None()
            team_info.team_id = _team_id
            team_info.target_team_id = target_team_id
            team_info.is_friendly = is_friendly
            team_info.level_exercise_monster_cfg_id = _level_exercise_monster_cfg_id
            team_info.round_id = monster_id_to_round_id_dict.get(_level_exercise_monster_cfg_id, 0)
            team_info.round_idx = monster_id_to_round_idx_dict.get(_level_exercise_monster_cfg_id, 0)
            team_info.level_id = level_id
            team_info.level_exercise_team_id = in_military_drill_team_id
            team_info.retreat_ship_info_dict = _retreat_ship_info_dict
            team_info_dict[_team_id] = team_info

        retreat_info = game_data_utils.parse_cfg_str_to_dict_of_list(level_exercise_record[LevelExerciseField.CACHE_RETREAT_INFO], is_num = True, is_force_list = True)
        _add_team_info(in_military_drill_team_id, level_exercise_record[LevelExerciseField.ATTACK_TARGET], True, 0, retreat_info)
        friendly_team_info_str = level_exercise_record[LevelExerciseField.FRIENDLY_RECORDS]
        if friendly_team_info_str:
            for team_id, target_id, level_exercise_monster_cfg_id in game_data_utils.parse_cfg_str_to_list_of_list(friendly_team_info_str, is_num = True):
                _add_team_info(team_id, target_id, True, level_exercise_monster_cfg_id)
                enemy_team_info_str = level_exercise_record[LevelExerciseField.RECORDS]
                if enemy_team_info_str:
                    for team_id, target_id, level_exercise_monster_cfg_id in game_data_utils.parse_cfg_str_to_list_of_list(enemy_team_info_str, is_num = True):
                        _add_team_info(team_id, target_id, False, level_exercise_monster_cfg_id)
                        waiting_friendly_team_info_str = level_exercise_record[LevelExerciseField.FRIENDLY_CONVERGING_MONSTER]
                        for round_idx, waiting_team_str_lst in game_data_utils.parse_cfg_str_to_dict_of_list(waiting_friendly_team_info_str, default = { }, is_force_list = True).items():
                            for waiting_team_str in waiting_team_str_lst:
                                (team_id, time, level_exercise_monster_cfg_id, is_main_target) = game_data_utils.parse_cfg_str_to_list(waiting_team_str, is_num = True, split_char = '|')
                                _add_team_info(team_id, 0, True, level_exercise_monster_cfg_id)
                                waiting_monster_team_info_str = level_exercise_record[LevelExerciseField.CONVERGING_MONSTER]
                                for round_idx, waiting_team_str_lst in game_data_utils.parse_cfg_str_to_dict_of_list(waiting_monster_team_info_str, default = { }, is_force_list = True).items():
                                    for waiting_team_str in waiting_team_str_lst:
                                        (team_id, time, level_exercise_monster_cfg_id, is_main_target) = game_data_utils.parse_cfg_str_to_list(waiting_team_str, is_num = True, split_char = '|')
                                        _add_team_info(team_id, 0, False, level_exercise_monster_cfg_id)
                                        return team_info_dict
