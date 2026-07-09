# Source Generated with Decompyle++
# File: get_asteroid_garrison_info.pyc (Python 3.11)

ret = []
for team_record in six.itervalues(GameDataMgr().get_table(TableID.TEAM)):
    if is_in_reaction_state(team_record[TeamField.REACTION_STATE], TeamField.ReactionState.REACTION_STATE_IN_GARRISON_CMD) and team_record[TeamField.TARGET_ID] == wid:
        ret.append((team_record[TeamField.TEAM_ID], get_relation(TableID.TEAM, team_record)))
    return ret
