# Source Generated with Decompyle++
# File: parse_team_escort_str.pyc (Python 3.11)

escort_teams = parse_cfg_str_to_list_of_list(escort_str, is_num = True, allow_empty_data = True)
target_team_id = escort_teams[0][0] if escort_teams[0] else 0
escort_team_ids = escort_teams[1] if len(escort_teams) > 1 else []
return (target_team_id, escort_team_ids)
