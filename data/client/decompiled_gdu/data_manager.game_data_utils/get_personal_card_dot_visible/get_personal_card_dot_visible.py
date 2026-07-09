# Source Generated with Decompyle++
# File: get_personal_card_dot_visible.pyc (Python 3.11)

RedPointName = RedPointName
import common.red_point.red_point_definition
RedPointSystem = RedPointSystem
import common.red_point.red_point_system
friend_mgr = friend_mgr
import data_manager
GMInterface = GMInterface
import sdk.gm_interface
is_show_guard_plan_2024_card_point = is_show_guard_plan_2024_card_point
is_show_guard_plan_2025_card_point = is_show_guard_plan_2025_card_point
import ui.activity_earthday.activity_earthday_curvature_bell.curvature_bell_utils
personal_card_utils = personal_card_utils
import ui.personal_card
newbie_level_get = newbie_level_get
NEWBIE_WECOM_REDPOINT_BASE_LEVEL = NEWBIE_WECOM_REDPOINT_BASE_LEVEL
NEWBIE_PROFILE_MANAGE_REDPOINT_BASE_LEVEL = NEWBIE_PROFILE_MANAGE_REDPOINT_BASE_LEVEL
import activity.activity_first_pay
is_first_season = sys_param_utils.is_first_season()
newbie_level = newbie_level_get() if is_first_season else 999
if not RedPointSystem().get_point_num(RedPointName.USER) > 0 or newbie_level >= NEWBIE_PROFILE_MANAGE_REDPOINT_BASE_LEVEL:
    if not GMInterface().has_unread_msg():
        if not friend_mgr.FriendMgr().is_apply_has_unread_message():
            if not GMInterface().has_unread_sprite_msg():
                if not has_unchange_name():
                    if not not common_config.has_clicked_wecom() or newbie_level >= NEWBIE_WECOM_REDPOINT_BASE_LEVEL:
                        if not check_logbook_dot_visible():
                            if not is_show_guard_plan_2024_card_point():
                                if not personal_card_utils.is_show_personal_card_show_manage_dot() or newbie_level >= NEWBIE_PROFILE_MANAGE_REDPOINT_BASE_LEVEL:
                                    is_show_red_point = is_show_guard_plan_2025_card_point()
                                    if sys_param_utils.is_first_season() and get_base_facility_level() < 5:
                                        is_show_red_point = False
return is_show_red_point
