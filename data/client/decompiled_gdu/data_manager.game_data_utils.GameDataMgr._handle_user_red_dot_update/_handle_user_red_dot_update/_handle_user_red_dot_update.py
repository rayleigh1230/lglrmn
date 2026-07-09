# Source Generated with Decompyle++
# File: _handle_user_red_dot_update.pyc (Python 3.11)

get_user_red_dot_all_data = get_user_red_dot_all_data
get_user_red_dot_data = get_user_red_dot_data
import data_manager.game_data_utils
season_data = get_user_red_dot_all_data(UserRedDotField.Type.TYPE_SEASON)
permanent_data = get_user_red_dot_all_data(UserRedDotField.Type.TYPE_PERMANENT)
if common_config.is_enable_community_mini_program():
    data = permanent_data.get(str(UserRedDotField.Permanent.PERMANENT_WECHAT_COMMUNITY), '')
    red_point_path = RedPointName.USER_SERVICE_COMMUNITY_MINI_PROGRAM
    newbie_level_match = newbie_level_match
    NEWBIE_WEPROGRAM_REDPOINT_BASE_LEVEL = NEWBIE_WEPROGRAM_REDPOINT_BASE_LEVEL
    import activity.activity_first_pay
    point_num = 1 if len(data) <= 0 and newbie_level_match(NEWBIE_WEPROGRAM_REDPOINT_BASE_LEVEL) else 0
    RedPointSystem().notify_point_num(red_point_path, point_num)
has_invite = get_user_red_dot_data(UserRedDotField.Type.TYPE_SEASON, UserRedDotField.Season.SEASON_PRE_SQUAD_INVITED)
if has_invite:
    if isinstance(has_invite, str) and int(has_invite[0]):
        RedPointSystem().notify_point_num(RedPointName.PRE_UNION_INVITE, 1)
    else:
        RedPointSystem().notify_point_num(RedPointName.PRE_UNION_INVITE, 0)
else:
    RedPointSystem().notify_point_num(RedPointName.PRE_UNION_INVITE, 0)
is_activity_can_show = is_activity_can_show
import data_manager.activity_data_utils
if is_activity_can_show(CfgActivityField.Id.ID_BASE_MODIFY_GUIDE if common_config.is_china_region() else CfgActivityField.Id.ID_BASE_MODIFY_GUIDE_GB):
    data = permanent_data.get(str(UserRedDotField.Permanent.PERMANENT_BASE_MODIFY_GUIDE_BANNER), '0')
    RedPointSystem().notify_point_num(RedPointName.ACTIVITY_PLAYER_BASE_REWORK_GUIDE, 1 if data == '0' else 0)
    return None
