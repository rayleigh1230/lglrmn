# Source Generated with Decompyle++
# File: get_efficiency_robot_num_and_max.pyc (Python 3.11)

record = GameDataMgr().get_record(TableID.USER_EFFICIENCY_ROBOT, GameDataMgr().user_id)
if not record:
    return (0, 0)
return (None[UserEfficiencyRobotField.ROBOT_CUR], record[UserEfficiencyRobotField.ROBOT_MAX])
