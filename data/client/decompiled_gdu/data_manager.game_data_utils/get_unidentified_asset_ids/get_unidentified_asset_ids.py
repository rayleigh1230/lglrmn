# Source Generated with Decompyle++
# File: get_unidentified_asset_ids.pyc (Python 3.11)

reward_drop_utils = reward_drop_utils
import data_manager.res_info.reward_drop
unidentified_asset_ids = []
reward_drop_ids = []
dock_facilities = get_dock_facilities_by_cfg_id(dock_item_id)
for base_id, f_id in six.iteritems(dock_facilities):
    f_record = Tb_cfg_facility_level_ex.get(f_id)
    if not f_record[Tb_cfg_facility_level_ex.IMMEDIATE_EFFECTS]:
        continue
    effects = parse_cfg_str_to_dict_of_list(f_record[Tb_cfg_facility_level_ex.IMMEDIATE_EFFECTS], is_num = True, is_cache = True)
    for effect_id, value in six.iteritems(effects):
        if effect_id == EFFECT_SHOW_UNIDENTIFIED_ASSET:
            reward_drop_ids.append(value)
        for idx, drop_id in enumerate(reward_drop_ids):
            (drop_reward_list, roulette_res_list) = reward_drop_utils.get_drop_res_list(drop_id)
            reward_list = reward_drop_utils.convert_to_res_cfg_list(drop_reward_list)
            reward = reward_list[0]
            if reward[0] == CfgResDefField.ResId.RES_ID_ASSET_PACK:
                unidentified_asset_ids.append(reward[1])
            return unidentified_asset_ids
