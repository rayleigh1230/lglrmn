# Source Generated with Decompyle++
# File: get_user_personal_estimate_score.pyc (Python 3.11)

record = GameDataMgr().get_record(TableID.USER_STUFF, GameDataMgr().user_id)
score = record.get(UserStuffField.PERSONAL_TASK_DAWN_SCORE, 0)
score += record.get(UserStuffField.PERSONAL_TASK_EX_DAWN_SCORE, 0)
return score
