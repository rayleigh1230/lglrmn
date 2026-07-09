# Source Generated with Decompyle++
# File: get_speedup_info.pyc (Python 3.11)

game_data_mgr = GameDataMgr()
res_record = game_data_mgr.get_record(TableID.USER_RES, game_data_mgr.user_id)
if res_record:
    speedup_cur = res_record[UserResField.SPEEDUP_CUR]
    speedup_max = res_record[UserResField.SPEEDUP_MAX]
    speedup_time = res_record[UserResField.SPEEDUP_TIME]
    speedup_stock = res_record[UserResField.SPEEDUP_STOCK]
    speedup_stop_time = res_record[UserResField.SPEEDUP_STOP_TIME] if UserResField.SPEEDUP_STOP_TIME in res_record else 0
    speedup_add = get_speedup_add_speed()
    time_per_speedup = 3600 / speedup_add
    cur_time = time_utils.get_server_time()
    if speedup_stop_time and speedup_stop_time > speedup_time:
        spend_time = speedup_stop_time - speedup_time
    else:
        spend_time = cur_time - speedup_time
    estimate_add = min(int(spend_time * speedup_add / 3600) + speedup_stock, speedup_max - speedup_cur)
    estimate_add = max(estimate_add, 0)
    return (speedup_cur, speedup_max, int(time_per_speedup - spend_time) % time_per_speedup, estimate_add)
