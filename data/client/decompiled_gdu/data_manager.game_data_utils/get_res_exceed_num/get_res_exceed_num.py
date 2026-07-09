# Source Generated with Decompyle++
# File: get_res_exceed_num.pyc (Python 3.11)

exceed_res = { }
res_max = get_max_user_res()
user_res = get_estimate_user_res()
for res_type in res_dic:
    res_data = user_res.get(res_type, None)
    if res_data and res_data + res_dic[res_type] > res_max[res_type]:
        exceed_num = res_data + res_dic[res_type] - res_max[res_type]
        if exceed_num >= res_dic[res_type]:
            exceed_num = res_dic[res_type]
        exceed_res[res_type] = exceed_num
    if res_type == CfgResDefField.ResId.RES_ID_REPAIR_PARTS:
        building_id = get_player_base_building_id()
        (current_repairs, add_repairs, max_repairs) = get_current_repair_parts(building_id, get_extra_info = True)
        if current_repairs + res_dic[res_type] > max_repairs:
            exceed_num = current_repairs + res_dic[res_type] - max_repairs
            if exceed_num >= res_dic[res_type]:
                exceed_num = res_dic[res_type]
            exceed_res[res_type] = exceed_num
        continue
    if res_type == CfgResDefField.ResId.RES_ID_EFFICIENCY_ROBOT:
        (cur, max) = get_efficiency_robot_num_and_max()
        if cur + res_dic[res_type] > max:
            exceed_num = res_dic[res_type] + cur - max
            if exceed_num >= res_dic[res_type]:
                exceed_num = res_dic[res_type]
            exceed_res[res_type] = exceed_num
    return exceed_res
