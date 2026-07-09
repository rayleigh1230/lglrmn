# Source Generated with Decompyle++
# File: cal_user_res_and_ship_fix_estimated_res.pyc (Python 3.11)

g_user_res_estimate_count += 1
if g_user_res_estimate_count % 3 == 0:
    g_user_res_estimate_count = 0
    cal_user_estimated_res()
cal_ship_auto_fix_estimated()
