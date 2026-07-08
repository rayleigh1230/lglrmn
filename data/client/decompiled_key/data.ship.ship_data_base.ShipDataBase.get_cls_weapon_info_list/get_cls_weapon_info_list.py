# Source Generated with Decompyle++
# File: get_cls_weapon_info_list.pyc (Python 3.11)

game_data_utils = game_data_utils
import data_manager
SHIP_MAIN_DOCK_SYSTEM_MODULE_ID = SHIP_MAIN_DOCK_SYSTEM_MODULE_ID
import common.preprocess_data
module_info_list = game_data_utils.parse_cfg_str_to_list_of_list(module_info_str, True, [])
weapon_info_list = []
ship_dock_module_id = SHIP_MAIN_DOCK_SYSTEM_MODULE_ID.get(ship_id)
game_data_utils = game_data_utils
import data_manager
if module_info_list:
    for module_info in module_info_list:
        (slot_index, module_id, hp) = module_info
        slot_info = game_data_utils.get_module_slot_info(ship_id, slot_index)
        if not slot_info:
            print('[Error][ShipData] ship id: {0} has not slot: {1}'.format(ship_id, slot_index))
            continue
        module_type = game_data_utils.get_module_type_by_slot_cfg(slot_info)
        group_num = slot_info[Tb_cfg_ship_slot.TARGET_NUM]
        if module_type not in (ModuleType.MAIN, ModuleType.WEAPON):
            continue
        if module_id == ship_dock_module_id:
            continue
        weapon_info_list.append((slot_index, module_id, hp, max(1, group_num)))
        return weapon_info_list
