# Source Generated with Decompyle++
# File: get_user_fasion_score.pyc (Python 3.11)

record = GameDataMgr().get_record(TableID.USER_FASHION_SCORE, GameDataMgr().user_id)
if record:
    return record[UserFashionScoreField.TOTAL_SCORE]
