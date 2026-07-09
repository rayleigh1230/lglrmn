# Source Generated with Decompyle++
# File: get_module_attr_value.pyc (Python 3.11)

config = Tb_cfg_module.get(module_id)
if not config:
    return 0
value = None
V_SPEED_ADD_RATIO = V_SPEED_ADD_RATIO
V_WARP_SPEED_ADD_RATIO = V_WARP_SPEED_ADD_RATIO
import data.ship_attr_calc

def rt_wrap(_ret = None, modifier = None):
    is_calc = isinstance(_ret, EnhanceCalculator)
    if is_calc and calculation_mode == CALC_MODE_ONLY_VALUE:
        return modifier(_ret.calculate_full())
    if None:
        return _ret
    return modifier(_ret)


def module_effect_adds_to_calc(name, adds):
    calc = EnhanceCalculator(CalculationExpression(name))
    for add in adds:
        calc.bind_values(DiffData, add.enhance_name, add.value, name)
        return calc


def get_null_calculator():
    return EnhanceCalculator(CalculationConstant(0))

if attr_type == common_definition.MA_MODULE_DPS:
    calc = get_weapon_ship_dps_calc(module_id, slot_id, enhancements, modules = modules)
    return rt_wrap(calc, int)
if None == common_definition.MA_MODULE_REPAIR:
    calc = get_module_repair_calc(module_id, slot_id, enhancements, modules = modules)
    return rt_wrap(calc, int)
if None == common_definition.MA_MODULE_OPERATION:
    calc = get_module_opeation_calc(module_id, slot_id, enhancements, modules = modules)
    return rt_wrap(calc, int)
if None == common_definition.MA_MODULE_AIR_DPS:
    calc = get_weapon_air_defend_dps_calc(module_id, slot_id, enhancements, modules = modules)
    return rt_wrap(calc, int)
if None == common_definition.MA_MODULE_COEF_DPS:
    calc = get_weapon_destroy_coef_dps_calc(module_id, slot_id, enhancements, modules = modules)
    return rt_wrap(calc, int)
if None == common_definition.MA_REPAIR:
    value = ''
    return value
if None == common_definition.MA_ENGINEER:
    value = get_module_effect_ori_value(module_id, CfgModuleEffectField.Effect.EFFECT_BUILD_SPEED)
elif attr_type == common_definition.MA_AIRCRAFT:
    value = get_module_effect_ori_value(module_id, CfgModuleEffectField.Effect.EFFECT_CARRIER) % 100
elif attr_type == common_definition.MA_ARMOR:
    value = get_module_effect_ori_value(module_id, CfgModuleEffectField.Effect.EFFECT_BALLISTIC_INJURY_SUB)
elif attr_type == common_definition.MA_ARMOR_REPAIR:
    value = get_module_effect_ori_value(module_id, CfgModuleEffectField.Effect.EFFECT_SHIP_ARMOR_REPAIR_INC)
elif attr_type == common_definition.MA_SHIELD:
    value = get_module_effect_ori_value(module_id, CfgModuleEffectField.Effect.EFFECT_ENERGY_INJURY_DEC)
elif attr_type == common_definition.MA_MODULE_SHIP_HP:
    value = get_module_effect_ori_value(module_id, CfgModuleEffectField.Effect.EFFECT_SHIP_HP)
elif attr_type == common_definition.MA_MINE_LEVEL:
    value = get_module_effect_ori_value(module_id, CfgModuleEffectField.Effect.EFFECT_EXPLOIT_LEVEL)
    add_num = get_module_effect_ori_value_info(module_id, CfgModuleEffectField.Effect.EFFECT_EXPLOIT_LEVEL_ADD)
    calc = get_after_system_effect_value_calc(enhancements, None, slot_id, value, attr_type, add_num = add_num, include_re_extend = include_re_extend)
    return rt_wrap(calc, int)
if attr_type == common_definition.MA_MINE_SPEED:
    value = get_module_effect_ori_value(module_id, CfgModuleEffectField.Effect.EFFECT_EXPLOIT_SPEED)
    add_num = get_module_effect_ori_value_info(module_id, CfgModuleEffectField.Effect.EFFECT_EXPLOIT_SPEED_INC)
    calc = get_after_system_effect_value_calc(enhancements, None, slot_id, value, attr_type, add_num = add_num, include_re_extend = include_re_extend)
    return rt_wrap(calc, int)
if None == common_definition.MA_MODULE_CAPACITY:
    value = get_module_effect_ori_value(module_id, CfgModuleEffectField.Effect.EFFECT_MODULE_CAPACITY)
    add_ratio = get_module_effect_ori_value_info(module_id, CfgModuleEffectField.Effect.EFFECT_MODULE_CAPACITY_INC)
    calc = get_after_system_effect_value_calc(enhancements, None, slot_id, value, attr_type, add_ratio = add_ratio, include_re_extend = include_re_extend)
    return rt_wrap(calc, int)
if None == common_definition.MA_SHIP_SPEED:
    add_ratio = get_module_effect_ori_value_info(module_id, CfgModuleEffectField.Effect.EFFECT_SPEED)
    calc = module_effect_adds_to_calc(V_SPEED_ADD_RATIO, add_ratio)
    return rt_wrap(calc)
if None == common_definition.MA_SHIP_WARP_SPEED:
    add_ratio = get_module_effect_ori_value_info(module_id, CfgModuleEffectField.Effect.EFFECT_CURVATURE_SPEED)
    calc = module_effect_adds_to_calc(V_WARP_SPEED_ADD_RATIO, add_ratio)
    return rt_wrap(calc)
if None == common_definition.MA_OPERATION_LEVEL:
    value = get_module_effect_ori_value(module_id, effect_def.EffectId.Normal.EFFECT_OPERATION_LEVEL)
elif attr_type == common_definition.MA_MECHANISM:
    value = '--'
    return value
if attr_type in (common_definition.MA_DAMAGE, common_definition.MA_OPERATION_DAMAGE):
    if module_id not in WEAPON_ACTION_BELONG_DATA:
        return rt_wrap(get_null_calculator())
    weapon_action_id = None[module_id]
    main_dps_type = config[Tb_cfg_module.MAIN_DPS_TYPE]
    calc = get_weapon_attack_calc(weapon_action_id, module_id, slot_id, enhancements, main_dps_type, modules = modules, is_use_air_effect = False)
    return rt_wrap(calc, int)
if None in (common_definition.MA_ACTION_TIMES, common_definition.MA_WORK_TIMES):
    if module_id not in WEAPON_ACTION_BELONG_DATA:
        return rt_wrap(get_null_calculator())
    weapon_action_id = None[module_id]
    calc = get_weapon_action_attr_value_calc(enhancements, None, slot_id, weapon_action_id, 'Tb_cfg_weapon_action.ACTION_TIMES')
    return rt_wrap(calc, int)
if None == common_definition.MA_ATTACK_INTERVAL:
    calc = get_weapon_attr_value_calc(enhancements, None, slot_id, module_id, 'Tb_cfg_weapon.ATTACK_INTERVAL')
    calc.cur_expression = calc.get_expression() / CalculationConstant(1000)
    return rt_wrap(calc)
if None == common_definition.MA_INIT_PERPARE_TIME:
    calc = get_weapon_attr_value_calc(enhancements, None, slot_id, module_id, 'Tb_cfg_weapon.INIT_PERPARE_TIME')
    calc.cur_expression = calc.get_expression() / CalculationConstant(1000)
    return rt_wrap(calc, int)
if None == common_definition.MA_AIM_TIME:
    calc = get_weapon_attr_value_calc(enhancements, None, slot_id, module_id, 'Tb_cfg_weapon.INIT_PERPARE_TIME', modules = modules, drone_slot_id = drone_slot_id)
    calc.cur_expression = calc.get_expression().max(calc.get_expression() / CalculationConstant(1000), CalculationConstant(0))
    return rt_wrap(calc)
if None == common_definition.MA_DURATION:
    if module_id not in WEAPON_ACTION_BELONG_DATA:
        return rt_wrap(get_null_calculator())
    weapon_action_id = None[module_id]
    calc = get_weapon_action_attr_value_calc(enhancements, None, slot_id, weapon_action_id, 'Tb_cfg_weapon_action.DURATION')
    calc.cur_expression = calc.get_expression() / CalculationConstant(1000)
    return rt_wrap(calc)
if None == common_definition.MA_FLIGHT_TIME:
    before_calc = get_weapon_attr_value_calc(enhancements, None, slot_id, module_id, 'Tb_cfg_weapon.FLIGHT_TIME_BEFORE_CD', modules = modules)
    before_calc.cur_expression = before_calc.get_expression() / CalculationConstant(1000)
    after_calc = get_weapon_attr_value_calc(enhancements, None, slot_id, module_id, 'Tb_cfg_weapon.FLIGHT_TIME_AFTER_CD', modules = modules)
    after_calc.cur_expression = after_calc.get_expression() / CalculationConstant(1000)
    calc = before_calc
    calc.make_merge(after_calc, calc.get_expression() * CalculationConstant(common_definition.FLIGHT_TIME_BEFORE_AND_AFTER_COM) + after_calc.get_expression())
    return rt_wrap(calc)
if None == common_definition.MA_ATTACK_CD_TIME:
    calc = get_weapon_attr_value_calc(enhancements, None, slot_id, module_id, 'Tb_cfg_weapon.CD_TIME', modules = modules)
    calc.cur_expression = calc.get_expression().max(calc.get_expression() / CalculationConstant(1000), CalculationConstant(0))
    return rt_wrap(calc)
if None == common_definition.MA_WARNING_EFFICIENCY:
    calc = get_weapon_attr_value_calc(enhancements, None, slot_id, module_id, 'Tb_cfg_weapon.EARLY_WARNING_EFFICIENCY', modules = modules)
    calc.cur_expression = calc.get_expression().max(calc.get_expression(), CalculationConstant(0))
    return rt_wrap(calc)
if None == common_definition.MA_REPEAT_TIMES:
    if module_id not in WEAPON_ACTION_BELONG_DATA:
        return rt_wrap(get_null_calculator())
    weapon_action_id = None[module_id]
    calc = get_weapon_action_attr_value_calc(enhancements, None, slot_id, weapon_action_id, 'Tb_cfg_weapon_action.REPEAT_TIMES')
    return rt_wrap(calc, int)
return None
return rt_wrap(get_after_system_effect_value_calc(enhancements, None, slot_id, value, attr_type, include_re_extend = include_re_extend), int)
