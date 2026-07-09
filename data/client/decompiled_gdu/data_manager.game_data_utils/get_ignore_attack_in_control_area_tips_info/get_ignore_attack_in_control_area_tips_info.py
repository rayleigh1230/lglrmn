# Source Generated with Decompyle++
# File: get_ignore_attack_in_control_area_tips_info.pyc (Python 3.11)

if sys_param_utils.is_L5_season():
    return (common_config.USER_DEFAULT_IGNORE_ATTACK_IN_CONTROL_AREA_TIPS, language.L5_THREAT_CONFIRM_TIPS_TITLE)
season = None.get_season_id()
return (common_config.USER_DEFAULT_IGNORE_ATTACK_IN_CONTROL_AREA_TIPS_FORMAT.format(season), language.L0_THREAT_CONFIRM_TIPS_TITLE)
