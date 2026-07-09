# Source Generated with Decompyle++
# File: get_block_plan_relation.pyc (Python 3.11)

block_data = plan_record.get(PlanField.BLOCKADE_TEAMS)
if block_data:
    block_teams = parse_cfg_str_to_list_of_list(block_data, True)
    if block_teams:
        all_relation = []
        for team in block_teams:
            team_id = team[1] if team and len(team) >= 2 else 0
            team_record = GameDataMgr().get_record(TableID.TEAM, team_id)
            if team_record:
                all_relation.append(get_relation(TableID.TEAM, team_record, need_check_neutral_communicating = True))
            if all_relation:
                if RELATION_ENEMY_NPC in all_relation:
                    return RELATION_ENEMY_NPC
                return None[0]
            return None
