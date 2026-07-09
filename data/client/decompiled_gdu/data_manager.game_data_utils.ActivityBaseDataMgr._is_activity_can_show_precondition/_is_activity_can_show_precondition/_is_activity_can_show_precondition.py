# Source Generated with Decompyle++
# File: _is_activity_can_show_precondition.pyc (Python 3.11)

sys_param_utils = sys_param_utils
import data_manager
cross_conquer_utils = cross_conquer_utils
import data_manager.cross_conquer
if sys_param_utils.is_io_season():
    return False
if None.is_self_in_cross_dungeon():
    return False
GameDataMgr = GameDataMgr
import data_manager.game_data_mgr
if cross_conquer_utils.is_crosser(GameDataMgr().user_id):
    return False
activity_data = None(activity_id)
if not activity_data.is_valid_data:
    return False
if None(activity_data.activity_region) != 0 and activity_data.activity_region != common_config.get_game_region():
    return False
app_screen = None.app_screen
SDKMgr = SDKMgr
import sdk.sdk_mgr
if not app_screen != 0 and SDKMgr().is_feature_can_show(app_screen):
    return False
game_data_utils = game_data_utils
import data_manager
(is_show, _) = game_data_utils.get_can_user_use_function(SysParamField.BanType.BAN_TYPE_REVIEW_SERVER_ACTIVITY_PAGE, activity_id)
if not is_show:
    return False
