# Source Generated with Decompyle++
# File: get_newbie_drill_info.pyc (Python 3.11)

res_data = { }
full_timestamp = 0
drill_res_record = GameDataMgr().get_record(TableID.USER_EXERCISE_REWARD, GameDataMgr().user_id)
if drill_res_record:
    acc_start_time = drill_res_record[UserExerciseRewardField.ACC_START_TIME]
    if acc_start_time == 0:
        return (res_data, full_timestamp)
    acc_cur = None[UserExerciseRewardField.ACC_CUR]
    acc_max = drill_res_record[UserExerciseRewardField.ACC_MAX]
    last_acc_time = acc_start_time + acc_cur
    not_receive_acc_time = max(0, min(time_utils.get_server_time() - last_acc_time, acc_max - acc_cur))
    if not_receive_acc_time < configdata.EXERCISE_REWARD_INTERVAL:
        align_duration = 0
    else:
        align_duration = (not_receive_acc_time // configdata.EXERCISE_REWARD_INTERVAL) * configdata.EXERCISE_REWARD_INTERVAL
    metal_add = drill_res_record[UserExerciseRewardField.METAL_ADD]
    if metal_add > 0:
        acc_metal = drill_res_record[UserExerciseRewardField.METAL_CUR] + int(math.ceil((metal_add / float(time_utils.HOUR_TIMESPAN)) * align_duration))
        res_data[CfgResDefField.ResId.RES_ID_METAL] = [
            acc_metal,
            metal_add]
    crystal_add = drill_res_record[UserExerciseRewardField.CRYSTAL_ADD]
    if crystal_add > 0:
        acc_crystal = drill_res_record[UserExerciseRewardField.CRYSTAL_CUR] + int(math.ceil((crystal_add / float(time_utils.HOUR_TIMESPAN)) * align_duration))
        res_data[CfgResDefField.ResId.RES_ID_CRYSTAL] = [
            acc_crystal,
            crystal_add]
    deuterium_add = drill_res_record[UserExerciseRewardField.DEUTERIUM_ADD]
    if deuterium_add > 0:
        acc_deuterium = drill_res_record[UserExerciseRewardField.DEUTERIUM_CUR] + int(math.ceil((deuterium_add / float(time_utils.HOUR_TIMESPAN)) * align_duration))
        res_data[CfgResDefField.ResId.RES_ID_DEUTERIUM] = [
            acc_deuterium,
            deuterium_add]
    if acc_cur < acc_max:
        deta_time = time_utils.get_server_time() - acc_start_time
        if deta_time < configdata.EXERCISE_REWARD_INTERVAL:
            full_timestamp = configdata.EXERCISE_REWARD_INTERVAL + acc_start_time
        elif deta_time >= acc_max:
            full_timestamp = 0
        else:
            full_timestamp = (deta_time // configdata.EXERCISE_REWARD_INTERVAL + 1) * configdata.EXERCISE_REWARD_INTERVAL + acc_start_time
    else:
        full_timestamp = 0
return (res_data, full_timestamp)
return (res_data, full_timestamp)
