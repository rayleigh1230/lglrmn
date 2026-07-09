# Source Generated with Decompyle++
# File: is_need_l5_threat_confirm.pyc (Python 3.11)

plan_utils = plan_utils
import common
select_state = select_state
import strategy.touch_event_handler
if plan_utils.is_belong_same_public_org_plan(select_info['key']):
    return None
ControlAreaDataMgr = ControlAreaDataMgr
import data_manager.control_area_data_mgr
obj_idx_g3 = select_state.get_index_g3(select_type, select_info)
(wid, _) = map_utils.index_g3_to_wid_with_coordinate(obj_idx_g3)
(save_key, _) = get_ignore_attack_in_control_area_tips_info()
if user_default.get_user_default_for_key(user_default.USER_DEFAULT_FOR_BOOL, save_key, True):
    return False
if None.is_control_area_season() and ControlAreaDataMgr().is_wid_in_control_area(wid):
    need_confirm = False
    if select_type == select_state.SELECT_TYPE_BUILDING:
        item_id = select_info.get('key')
        item_record = GameDataMgr().get_record(TableID.WORLD_ITEM, item_id)
        if item_record[WorldItemField.USERID]:
            need_confirm = True
    if select_type == select_state.SELECT_TYPE_TEAM:
        team_record = GameDataMgr().get_record(TableID.TEAM, select_info['key'])
        if team_record[TeamField.USERID]:
            need_confirm = True
    return need_confirm
