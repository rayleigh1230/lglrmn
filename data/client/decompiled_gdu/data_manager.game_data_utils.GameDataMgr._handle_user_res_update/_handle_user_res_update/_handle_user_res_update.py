# Source Generated with Decompyle++
# File: _handle_user_res_update.pyc (Python 3.11)

if update_record[UserResField.USERID] == self.user_id:
    if RES_COIN_CUR in update_record and RES_DEUTERIUM_CUR in update_record and RES_CRYSTAL_CUR in update_record and RES_METAL_CUR in update_record or RES_SPECIAL_MINE_CUR in update_record:
        return None
    game_data_utils = game_data_utils
    import data_manager
    game_data_utils.cal_user_estimated_res()
    return None
