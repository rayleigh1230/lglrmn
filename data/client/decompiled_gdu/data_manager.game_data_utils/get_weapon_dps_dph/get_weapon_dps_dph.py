# Source Generated with Decompyle++
# File: get_weapon_dps_dph.pyc (Python 3.11)

if weapon_id not in WEAPON_ACTION_BELONG_DATA:
    return 0
weapon_action_id = None[weapon_id]
config = Tb_cfg_weapon_action.get(weapon_action_id)
action = config[Tb_cfg_weapon_action.ACTION]
if (action not in (CfgWeaponActionField.Action.ACTION_ATTACK_ENERGY, CfgWeaponActionField.Action.ACTION_ATTACK_BALLISTIC, CfgWeaponActionField.Action.ACTION_REPAIR) or action == CfgWeaponActionField.Action.ACTION_REPAIR) and dps_type != common_definition.MA_MODULE_REPAIR:
    return 0
duration = None
cd_time = get_weapon_attr_value(enhancements, None, slot_id, weapon_id, 'Tb_cfg_weapon.CD_TIME', module_id = weapon_id, dps_type = dps_type) / 1000
flight_before_time = get_weapon_attr_value(enhancements, None, slot_id, weapon_id, 'Tb_cfg_weapon.FLIGHT_TIME_BEFORE_CD', module_id = weapon_id) / 1000
flight_after_time = get_weapon_attr_value(enhancements, None, slot_id, weapon_id, 'Tb_cfg_weapon.FLIGHT_TIME_AFTER_CD', module_id = weapon_id) / 1000
attack_interval = flight_before_time + flight_after_time + cd_time
if slot_id:
    install_num = Tb_cfg_ship_slot.get(slot_id)[Tb_cfg_ship_slot.INSTALL_NUM]
else:
    install_num = 1
action_times = get_weapon_action_attr_value(enhancements, None, slot_id, weapon_action_id, 'Tb_cfg_weapon_action.ACTION_TIMES')
attack = get_weapon_attack(weapon_action_id, weapon_id, slot_id, enhancements, dps_type, modules = modules)
if dps_type == common_definition.MA_MODULE_DPS and action == 2:
    default_armor_value = configdata.DISPLAY_ARMOR_USED
    attack = max(attack * default_armor_value / 100, attack - default_armor_value)
repeat_times = get_weapon_action_attr_value(enhancements, None, slot_id, weapon_action_id, 'Tb_cfg_weapon_action.REPEAT_TIMES')
total_hurt = action_times * repeat_times * attack
duration += get_weapon_action_attr_value(enhancements, None, slot_id, weapon_action_id, 'Tb_cfg_weapon_action.DURATION', module_id = weapon_id, dps_type = dps_type) / 1000
return total_hurt * 60 * install_num / (duration + attack_interval)
