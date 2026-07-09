# Source Generated with Decompyle++
# File: is_new_user_activation_awards_battlepass_new_202511.pyc (Python 3.11)

start_time = configdata.BATTLE_PASS_REWARD_SELECTION_EFFECT_TIME_VERSION_202511 if g_is_china_region else configdata.BATTLE_PASS_REWARD_SELECTION_EFFECT_TIME_VERSION_GB_202511
if server_open_time:
    server_open_time = get_server_open_time()
return server_open_time > start_time
