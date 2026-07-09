# Source Generated with Decompyle++
# File: get_robot_machine_info.pyc (Python 3.11)

game_data_mgr = GameDataMgr()
res_record = game_data_mgr.get_record(TableID.USER_EFFICIENCY_ROBOT, game_data_mgr.user_id)
if res_record:
    robot_cur = res_record[UserEfficiencyRobotField.ROBOT_CUR]
    robot_max = res_record[UserEfficiencyRobotField.ROBOT_MAX]
    robot_time = res_record[UserEfficiencyRobotField.ROBOT_TIME]
    robot_stock = res_record[UserEfficiencyRobotField.ROBOT_STOCK]
    robot_add = configdata.EFFICIENCY_ROBOT_ADD_SPEED
    time_per_robot = 3600 / robot_add
    cur_time = time_utils.get_server_time()
    spend_time = cur_time - robot_time
    estimate_add = min(int(spend_time * robot_add / 3600) + robot_stock, robot_max - robot_cur)
    estimate_add = max(estimate_add, 0)
    return (robot_cur, robot_max, int(time_per_robot - spend_time) % time_per_robot, estimate_add)
