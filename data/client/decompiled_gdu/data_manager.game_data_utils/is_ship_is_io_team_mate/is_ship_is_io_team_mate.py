# Source Generated with Decompyle++
# File: is_ship_is_io_team_mate.pyc (Python 3.11)

sys_param_utils = sys_param_utils
import data_manager
if sys_param_utils.is_io_season():
    user_list = get_io_user_list()
    return ship_record[ShipField.USERID] in user_list
