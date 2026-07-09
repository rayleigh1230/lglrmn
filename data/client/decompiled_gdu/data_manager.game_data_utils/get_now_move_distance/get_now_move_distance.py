# Source Generated with Decompyle++
# File: get_now_move_distance.pyc (Python 3.11)

FuncOpenType = FuncOpenType
import common.config.shared_definition
SeasonFuncOpenMgr = SeasonFuncOpenMgr
import data_manager.season_func_open.season_func_open_mgr
if SeasonFuncOpenMgr().is_func_open(FuncOpenType.TYPE_DISABLE_USER_MOVE_DISTANCE_LIMIT):
    return UNLIMITED_MOVE_DISTANCE
gdm = None()
user_record = gdm.get_record(TableID.USER_STUFF, gdm.user_id)
if user_record and user_record[UserStuffField.USER_MOVE_DISTANCE] > 0:
    return user_record[UserStuffField.USER_MOVE_DISTANCE]
return None.USER_TEAM_MOVE_DISTANCE_DEFAULT_LIMIT
