# Source Generated with Decompyle++
# File: cal_user_estimated_stuff.pyc (Python 3.11)

game_data_mgr = GameDataMgr()
stuff_update_record = { }
self_user_id = game_data_mgr.user_id
record = game_data_mgr.get_record(TableID.USER_STUFF, self_user_id)
if record:
    return None
passed_time = None(0, time_utils.get_server_time() - record[UserStuffField.PLAN_POINT_TIME])
speed = record[UserStuffField.PLAN_POINT_SPEED]
cur_point = passed_time * speed / 3600 + record[UserStuffField.PLAN_POINT]
num = min(cur_point, record[UserStuffField.PLAN_POINT_LIMIT])
stuff_update_record[PLAN_POINT_CUR] = num
game_data_mgr.update_record(TableID.USER_STUFF, self_user_id, stuff_update_record, True)
