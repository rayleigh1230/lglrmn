# Source Generated with Decompyle++
# File: is_new_user_activation_awards_battlepass.pyc (Python 3.11)

start_time = configdata.BATTLE_PASS_REWARD_SELECTION_EFFECT_TIME if g_is_china_region else configdata.BATTLE_PASS_REWARD_SELECTION_EFFECT_TIME_GB
if server_open_time:
    server_open_time = get_server_open_time()
return server_open_time > start_time
