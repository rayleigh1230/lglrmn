# Source Generated with Decompyle++
# File: get_new_facility_update_state.pyc (Python 3.11)

UpdateState = UpdateState
import scene_zoom0.building_interface.facility
cur_level = get_facility_current_level(facility_id)
max_level = Tb_cfg_facility.get(facility_id)[Tb_cfg_facility.LEVEL_MAX]
if facility_id in m0_utils.base_level_size():
    max_level = get_base_facility_max_level()
if cur_level == max_level:
    return UpdateState.MAX_LEVEL
next_level_cfg = None.get_facility_level_cfg(facility_id, cur_level + 1)
level_condition_json = next_level_cfg[Tb_cfg_facility_level_ex.CONDITION_NEW]
if level_condition_json:
    cur_dict = JsonUtil.loads(level_condition_json)
    cur_str = cur_dict.get('target_facility', '')
    if cur_str:
        level_condition_dict = parse_cfg_str_to_dict_of_list(cur_str, is_num = True)
        for pre_facility_id, lv in six.iteritems(level_condition_dict):
            pre_level = get_facility_current_level(pre_facility_id)
            if pre_level < lv:
                
                return None, UpdateState.CAN_NOT_UPDATE_LV
            return UpdateState.CAN_UPDATE
