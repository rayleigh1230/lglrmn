# Source Generated with Decompyle++
# File: is_small_ruin_being_recycling_by_user.pyc (Python 3.11)

team_table = GameDataMgr().get_table(TableID.TEAM)
if not team_table:
    return False
is_team_recycling = is_team_recycling
import common.team_utils
for team_record in six.itervalues(team_table):
    if team_record[TeamField.USERID] != GameDataMgr().user_id:
        continue
    if is_team_recycling(team_record, only_in_progress = False) and team_record[TeamField.TARGET_ID] == small_ruin_id:
        return True
    return False
