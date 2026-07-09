# Source Generated with Decompyle++
# File: get_special_mine_info.pyc (Python 3.11)

game_data_mgr = GameDataMgr()
res_record = game_data_mgr.get_record(TableID.USER_RES, game_data_mgr.user_id)
outside_num = 0
if need_outside:
    pass
if res_record:
    return (res_record[UserResField.SPECIAL_MINE_CUR], res_record[UserResField.SPECIAL_MINE_MAX], outside_num)
return (None, 0, outside_num)
