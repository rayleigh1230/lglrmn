# Source Generated with Decompyle++
# File: _add_team_info.pyc (Python 3.11)

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
