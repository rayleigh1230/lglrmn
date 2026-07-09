# Source Generated with Decompyle++
# File: get_user_norma_score_value.pyc (Python 3.11)

user_record = GameDataMgr().get_record(TableID.USER, GameDataMgr().user_id)
return user_record[UserField.NORMA_SCORE] if user_record else 0
