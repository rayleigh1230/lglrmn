# Source Generated with Decompyle++
# File: is_personal_io_camp.pyc (Python 3.11)

if building_id:
    building_id = get_player_base_building_id()
user_record = GameDataMgr().get_record(TableID.USER_CITY, building_id)
return bool(user_record[UserCityField.IO_CAMP_TYPE])
