# Source Generated with Decompyle++
# File: parse_facility_level_res_cost.pyc (Python 3.11)

res_cost_strs = cost_str.split(';')
res_condition = { }
for s in res_cost_strs:
    if s:
        (res_id, res_num) = s.split(',')
        res_id = int(res_id)
        res_num = int(res_num)
        res_condition[res_id] = res_num
    return res_condition
