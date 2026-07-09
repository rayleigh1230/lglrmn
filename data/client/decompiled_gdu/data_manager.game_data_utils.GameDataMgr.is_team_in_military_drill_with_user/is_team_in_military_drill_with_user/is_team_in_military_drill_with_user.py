# Source Generated with Decompyle++
# File: is_team_in_military_drill_with_user.pyc (Python 3.11)

if level_exercise_team_id:
    team_info_dict = self._military_drill_npc_team_info_dict.get(level_exercise_team_id, { })
else:
    team_info_dict = { }
    for _info_dict in self._military_drill_npc_team_info_dict.values():
        team_info_dict.update(_info_dict)
        if team_id in team_info_dict:
            return True
        return None
