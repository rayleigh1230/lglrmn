# Source Generated with Decompyle++
# File: get_dps_by_weapon_system_id.pyc (Python 3.11)

ship_weapon_dps = 0
ship_weapon_air_defend_dps = 0
for slot_id in SYSTEM_ID_TO_SLOT_ID_LIST.get(system_id, []):
    cfg_slot = Tb_cfg_ship_slot.get(slot_id)
    preset_module_id = cfg_slot[Tb_cfg_ship_slot.PRESET_MODULE_ID]
    ship_weapon_dps += get_weapon_ship_dps(preset_module_id, slot_id, None, None)
    ship_weapon_air_defend_dps += get_weapon_air_defend_dps(preset_module_id, slot_id, None, None)
    return (int(ship_weapon_dps), int(ship_weapon_air_defend_dps))
