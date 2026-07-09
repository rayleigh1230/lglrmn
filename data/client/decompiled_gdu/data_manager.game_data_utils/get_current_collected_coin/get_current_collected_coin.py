# Source Generated with Decompyle++
# File: get_current_collected_coin.pyc (Python 3.11)

user_res_record = GameDataMgr().get_record(TableID.USER_RES, GameDataMgr().user_id)
user_res_cap_record = GameDataMgr().get_record(TableID.USER_RES_CAP, GameDataMgr().user_id)
taxes = parse_cfg_str_to_list(user_res_cap_record[UserResCapField.TAX], True)
if time_utils.get_server_time() < user_res_record[UserResField.COIN_TIME]:
    return (sum(taxes[0:len(taxes) - 1]), max(len(taxes) - 1, 0))
coin_stop_time = user_res_record[UserResField.COIN_STOP_TIME] if None.COIN_STOP_TIME in user_res_record else 0
if coin_stop_time and coin_stop_time > user_res_record[UserResField.COIN_TIME]:
    passed_time = int((coin_stop_time - user_res_record[UserResField.COIN_TIME]) / configdata.TAX_INTERVAL)
else:
    passed_time = int((time_utils.get_server_time() - user_res_record[UserResField.COIN_TIME]) / configdata.TAX_INTERVAL)
if passed_time + len(taxes) > configdata.TAX_STORAGE_COUNT_MAX:
    passed_time = configdata.TAX_STORAGE_COUNT_MAX - len(taxes)
current_collected_coin = sum(taxes) + passed_time * user_res_record[UserResField.COIN_ADD]
current_collected_coin = user_res_record[UserResField.COIN_MAX] if current_collected_coin > user_res_record[UserResField.COIN_MAX] else current_collected_coin
return (current_collected_coin, len(taxes) + passed_time)
