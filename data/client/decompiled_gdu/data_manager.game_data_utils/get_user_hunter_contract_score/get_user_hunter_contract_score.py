# Source Generated with Decompyle++
# File: get_user_hunter_contract_score.pyc (Python 3.11)

res_record = GameDataMgr().get_record(TableID.USER_RES, GameDataMgr().user_id)
hunter_score = res_record[UserResField.HUNTER_SCORE] if res_record else 0
return hunter_score
