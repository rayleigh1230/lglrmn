# Source Generated with Decompyle++
# File: get_after_system_effect_value_calc.pyc (Python 3.11)

if isinstance(base_value, str):
    raise TypeError('invalid type of base_value')
if invalid_effect_list:
    invalid_effect_list = []
all_system_effect_list = collect_system_effect_list(cur_enhance_str, modules, valid_system_list, include_re_extend)
skill_effect_ratio_info = collect_skill_effect_ratio_info(module_id, dps_type, attr_type)

def check_valid_after_system_effect_info(_effect_info = None, _invalid_effect_list = None):
    effect_config = _effect_info.effect_record
    if effect_config[Tb_cfg_system_effect.EFFECT_ID] in _invalid_effect_list:
        return False
    return None(system_id, slot_id, _effect_info.system_id, effect_config, module_id = module_id, drone_slot_id = drone_slot_id, weapon_action_id = weapon_action_id)

d = dict()
for effect_info in all_system_effect_list:
    if not check_valid_after_system_effect_info(effect_info, invalid_effect_list):
        continue
    effect_add = calc_effect_add(effect_info, attr_type)
    if not effect_add.check_enhance_valid():
        continue
    if effect_add.enhance_name in d:
        d[effect_add.enhance_name].add_other(effect_add)
        continue
    d[effect_add.enhance_name] = effect_add
    C_BASE_NUM = C_BASE_NUM
    V_ADD_NUM = V_ADD_NUM
    V_ADD_RATIO = V_ADD_RATIO
    V_SKILL_EFFECT_RATIO = V_SKILL_EFFECT_RATIO
    AfterSystemEffectCalculator = AfterSystemEffectCalculator
    calculator_bind_three_basic_info = calculator_bind_three_basic_info
    import data.ship_attr_calc
    calculator = AfterSystemEffectCalculator()
    calculator.bind_values(ConstantData, 'base_num', base_value, C_BASE_NUM)
    calculator_bind_three_basic_info(calculator, d)
    if add_num:
        for module_effect_add_info in add_num:
            calculator.bind_values(DiffData, module_effect_add_info.enhance_name, module_effect_add_info.value, V_ADD_NUM)
            if add_ratio:
                for module_effect_add_info in add_ratio:
                    calculator.bind_values(DiffData, module_effect_add_info.enhance_name, module_effect_add_info.value, V_ADD_RATIO)
                    for skill_effect_ratio in skill_effect_ratio_info:
                        calculator.bind_values(DiffData, skill_effect_ratio.enhance_name, skill_effect_ratio.value, V_SKILL_EFFECT_RATIO)
                        return calculator
