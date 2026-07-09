# Source Generated with Decompyle++
# File: get_mixed_filed_l4_score.pyc (Python 3.11)

res_record = GameDataMgr().get_record(TableID.USER_RES, GameDataMgr().user_id)
if res_record:
    return res_record[UserResField.GF_L4_DATA_SCORE]
