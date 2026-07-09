# Source Generated with Decompyle++
# File: check_is_newbie_player.pyc (Python 3.11)

base_level = get_base_facility_level()
if sys_param_utils.is_waitting_server() and sys_param_utils.is_first_season() and base_level < common_config.NEWBIE_BAN_POPUP_BASELEVEL:
    return True
