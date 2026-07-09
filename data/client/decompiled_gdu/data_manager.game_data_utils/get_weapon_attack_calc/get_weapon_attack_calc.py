# Source Generated with Decompyle++
# File: get_weapon_attack_calc.pyc (Python 3.11)

add_ratio = get_module_effect_ori_value_info(module_id, CfgModuleEffectField.Effect.EFFECT_DAMAGE_INC)
add_by_effect = 0
invalid_effect_list = []
ratio = 100
config = Tb_cfg_weapon.get(module_id)
if dps_type == common_definition.MA_MODULE_DPS:
    invalid_effect_list = [
        CfgModuleEffectField.Effect.EFFECT_AIRCRAFT_INC,
        CfgModuleEffectField.Effect.EFFECT_DESTROY_INC]
    invalid_effect_list += ALL_ANIT_AIR_EFFECT_ID
elif dps_type == common_definition.MA_MODULE_AIR_DPS:
    invalid_effect_list = [
        CfgModuleEffectField.Effect.EFFECT_DESTROY_INC]
    add_ratio += get_module_effect_ori_value_info(module_id, CfgModuleEffectField.Effect.EFFECT_AIRCRAFT_INC)
    if ratio:
        ratio = config[Tb_cfg_weapon.AIRCRAFT_COEF]
    single_firepower_effect_list = {
        CfgModuleEffectField.Effect.EFFECT_AIRCRAFT_WEAPON_ATTKACK_ADD,
        CfgModuleEffectField.Effect.EFFECT_AIRCRAFT_WEAPON_ATTKACK_SUB}
    real_effect_ids = get_show_effect_id_by_module_id(module_id)
    single_firepower_effect_id = list(single_firepower_effect_list & set(real_effect_ids))
    if single_firepower_effect_id and is_use_air_effect:
        add_by_effect = get_module_effect_ori_value(module_id, single_firepower_effect_id[0])
    elif dps_type == common_definition.MA_MODULE_COEF_DPS:
        invalid_effect_list = [
            CfgModuleEffectField.Effect.EFFECT_AIRCRAFT_INC]
        invalid_effect_list += ALL_ANIT_AIR_EFFECT_ID
        add_ratio += get_module_effect_ori_value_info(module_id, CfgModuleEffectField.Effect.EFFECT_DESTROY_INC)
        if ratio:
            ratio = config[Tb_cfg_weapon.DESTROY_COEF]
        elif dps_type == common_definition.MA_MODULE_OPERATION:
            add_ratio = []
calc = get_weapon_action_attr_value_calc(enhancements, None, slot_id, weapon_action_id, 'Tb_cfg_weapon_action.ACTION_PARAM', add_ratio = add_ratio, invalid_effect_list = invalid_effect_list, modules = modules, add_single_firepower_by_effect = add_by_effect)
calc.cur_expression = calc.get_expression() * CalculationConstant(ratio / 100)
return calc
