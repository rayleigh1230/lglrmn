# Source Generated with Decompyle++
# File: register_user_res_timer.pyc (Python 3.11)

unregister_user_res_timer()
time_utils.register_neox_timer(1000, cal_user_res_and_ship_fix_estimated_res, TIMER_ID_RES_AND_SHIP_FIX_UPDATE)
time_utils.register_neox_timer(3000, cal_user_estimated_stuff, TIMER_ID_STUFF_UPDATE)
time_utils.register_neox_timer(1000, user_ship_reform_update, TIMER_ID_REFORM_UPDATE)
cal_user_estimated_res()
cal_user_estimated_stuff()
