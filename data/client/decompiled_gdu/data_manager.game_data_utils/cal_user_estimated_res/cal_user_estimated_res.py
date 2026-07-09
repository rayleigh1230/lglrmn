# Source Generated with Decompyle++
# File: cal_user_estimated_res.pyc (Python 3.11)

result_res_dict = { }
game_data_mgr = GameDataMgr()
self_user_id = game_data_mgr.user_id
res_record = game_data_mgr.get_record(TableID.USER_RES, self_user_id)
if not res_record:
    return result_res_dict
cur_time = None.get_server_time()
res_dic = get_user_res_server()
add_dic = get_add_user_res()
time_dic = get_time_user_res()
new_res_dict = { }
res_max_dic = get_max_user_res()
for res_id, res_num in six.iteritems(res_dic):
    max_num = res_max_dic[res_id]
    if res_num >= max_num:
        res_total_num = res_num
    elif res_id == CfgResDefField.ResId.RES_ID_COIN:
        city_add = 0
    else:
        city_add = (cur_time - time_dic[res_id]) * add_dic[res_id] / 3600
    res_total_num = min(res_num + city_add, max_num)
    result_res_dict[res_id] = int(res_total_num)
    new_res_dict[res_id] = res_total_num
    set_estimate_user_res(new_res_dict)
    return result_res_dict
