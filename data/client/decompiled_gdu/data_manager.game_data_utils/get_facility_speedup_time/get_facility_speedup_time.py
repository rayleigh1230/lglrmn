# Source Generated with Decompyle++
# File: get_facility_speedup_time.pyc (Python 3.11)

user_record = GameDataMgr().get_record(TableID.USER_CITY, get_player_base_building_id())
if user_record and user_record[UserCityField.RES_SPEEDUP_ADD]:
    ex_coef = 1 + user_record[UserCityField.RES_SPEEDUP_ADD] * 1 / 10000
    return int(ACCELERATION_TIME_PER_SPEEDUP * ex_coef)
