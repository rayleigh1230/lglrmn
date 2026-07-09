# Source Generated with Decompyle++
# File: get_stuff_plan_point.pyc (Python 3.11)

game_data_mgr = GameDataMgr()
record = game_data_mgr.get_record(TableID.USER_STUFF, game_data_mgr.user_id)
if record:
    plan_point_cur = int(record.get(PLAN_POINT_CUR, 0))
    plan_point = int(record[UserStuffField.PLAN_POINT])
    return max(plan_point_cur, plan_point)
