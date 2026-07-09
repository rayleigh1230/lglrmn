# Source Generated with Decompyle++
# File: is_l5_threat.pyc (Python 3.11)

if not sys_param_utils.is_control_area_season():
    return False
user_stuff_ex_record = None().get_record(TableID.USER_STUFF_EX, GameDataMgr().user_id)
if user_stuff_ex_record:
    red_name_attack_count = user_stuff_ex_record[UserStuffExField.RED_NAME_ATTACH_NUM]
    if red_name_attack_count <= 0:
        return False
    duration_time = None
    for idx, risk in enumerate(configdata.RED_NAME_MARK_RISK_THRESHOLD):
        if red_name_attack_count >= risk:
            duration_time = configdata.RED_NAME_MAKR_EXPIRED_TIME[idx]
        
        if duration_time:
            return time_utils.get_server_time() <= user_stuff_ex_record[UserStuffExField.RED_NAME_REFRESH_TIME] + duration_time
        return None
