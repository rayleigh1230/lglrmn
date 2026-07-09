# Source Generated with Decompyle++
# File: _handle_user_city_update.pyc (Python 3.11)

record = self.get_record(TableID.USER_CITY, update_record[UserCityField.ID])
if not record:
    return None
if None[UserCityField.USERID] == self.user_id:
    if UserCityField.RES_INFO in update_record and UserCityField.RES_SMELT_SPEED in update_record or UserCityField.SMELT_TIME in update_record:
        game_data_utils = game_data_utils
        import data_manager
        game_data_utils.cal_user_estimated_res()
if UserCityField.UNLOCK_SHIP_TYPE_REPAIR in update_record:
    self.refresh_ship_repair_when_unlock()
    return None
