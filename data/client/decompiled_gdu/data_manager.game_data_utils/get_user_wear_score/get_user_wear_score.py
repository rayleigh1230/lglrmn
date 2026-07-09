# Source Generated with Decompyle++
# File: get_user_wear_score.pyc (Python 3.11)

game_data_mgr = GameDataMgr()
res_record = game_data_mgr.get_record(TableID.USER, game_data_mgr.user_id)
if res_record:
    return res_record[UserField.WEAR_SCORE]
