# Source Generated with Decompyle++
# File: _get_weapon_info_list.pyc (Python 3.11)

SHIP_MAIN_DOCK_SYSTEM_MODULE_ID = SHIP_MAIN_DOCK_SYSTEM_MODULE_ID
import common.preprocess_data
weapon_info_list = []
if not module_info_list:
    return weapon_info_list
ship_id = None.ship_id
ship_dock_module_id = SHIP_MAIN_DOCK_SYSTEM_MODULE_ID.get(ship_id)
valid_module_types = (ModuleType.MAIN, ModuleType.WEAPON)
if self.is_dynamic_slot_assign:
    for slot_index, module_id, hp in module_info_list:
        module_type = Tb_cfg_module.get(module_id)[Tb_cfg_module.MODULE_TYPE]
        if module_type not in valid_module_types:
            continue
        if module_id == ship_dock_module_id:
            continue
        weapon_info_list.append((slot_index, module_id, hp, 1))
game_data_utils = game_data_utils
import data_manager
get_module_slot_info = game_data_utils.get_module_slot_info
get_module_type_by_slot_cfg = game_data_utils.get_module_type_by_slot_cfg
for slot_index, module_id, hp in module_info_list:
    slot_info = get_module_slot_info(ship_id, slot_index)
    if not slot_info:
        print('[Error][ShipData] ship id: {0} has not slot: {1}'.format(ship_id, slot_index))
        continue
    module_type = get_module_type_by_slot_cfg(slot_info)
    if module_type not in valid_module_types:
        continue
    if module_id == ship_dock_module_id:
        continue
    weapon_info_list.append((slot_index, module_id, hp, max(1, slot_info[Tb_cfg_ship_slot.TARGET_NUM])))
    return weapon_info_list
