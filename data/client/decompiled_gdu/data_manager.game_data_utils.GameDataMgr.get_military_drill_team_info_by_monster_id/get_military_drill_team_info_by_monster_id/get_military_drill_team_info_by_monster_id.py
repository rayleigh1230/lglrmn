# Source Generated with Decompyle++
# File: get_military_drill_team_info_by_monster_id.pyc (Python 3.11)

if level_exercise_team_id:
    team_info_dict = self._military_drill_npc_team_info_dict.get(level_exercise_team_id, { })
else:
    team_info_dict = { }
    for _info_dict in self._military_drill_npc_team_info_dict.values():
        team_info_dict.update(_info_dict)
        for team_info in team_info_dict.values():
            if team_info.level_exercise_monster_cfg_id == monster_id:
                
                return None, team_info
            return None
