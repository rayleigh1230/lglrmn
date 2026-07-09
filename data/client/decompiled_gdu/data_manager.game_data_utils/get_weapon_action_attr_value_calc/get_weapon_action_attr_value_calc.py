# Source Generated with Decompyle++
# File: get_weapon_action_attr_value_calc.pyc (Python 3.11)

value = get_attr_value(Tb_cfg_weapon_action, weapon_action_id, attr_type)
value += add_single_firepower_by_effect
return get_after_system_effect_value_calc(enhancements, system_id, slot_id, value, attr_type, add_ratio = add_ratio, invalid_effect_list = invalid_effect_list, modules = modules, module_id = module_id, dps_type = dps_type, weapon_action_id = weapon_action_id)
