# Source Generated with Decompyle++
# File: is_show_pre_sign.pyc (Python 3.11)

season_over_time = sys_param_utils.get_season_merge_time()
server_time = time_utils.get_server_time()
show_range = 259200
if season_over_time > server_time and season_over_time < server_time + show_range:
    return True
