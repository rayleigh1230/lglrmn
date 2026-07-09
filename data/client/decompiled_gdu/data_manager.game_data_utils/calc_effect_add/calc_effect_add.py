# Source Generated with Decompyle++
# File: calc_effect_add.pyc (Python 3.11)

add_base_num = 0
add_num = 0
add_ratio = 0
effect_config = effect_info.effect_record
cur_level = effect_info.cur_level
max_level = effect_info.max_level
is_system_effect = effect_info.is_system_effect
if is_system_effect:
    use_tb = Tb_cfg_system_effect
else:
    use_tb = Tb_cfg_module_effect
effect_id = effect_config[use_tb.EFFECT_ID]
weapon_num_attr = cfg_weapon_num_attr.get(effect_id)
if not weapon_num_attr:
    return EffectAddInfo(add_base_num = add_base_num, add_num = add_num, add_ratio = add_ratio)
effect_attr_type = None(str, weapon_num_attr[cfg_weapon_num_attr.EFFECT_ATTR_NAME])
table_name = weapon_num_attr[cfg_weapon_num_attr.TABLE_NAME]
key = ''
if table_name:
    key = 'Tb_{}.{}'.format(table_name, effect_attr_type.upper())
if 'FLIGHT_TIME_AFTER_CD' in attr_type:
    attr_type = attr_type.replace('FLIGHT_TIME_AFTER_CD', 'FLIGHT_TIME_BEFORE_CD')
if attr_type == key or attr_type == effect_attr_type:
    if is_system_effect and effect_config[Tb_cfg_system_effect.EFFECT_PARAM_LEVEL]:
        effect_param_level_dict = parse_cfg_str_to_dict_of_list(effect_config[Tb_cfg_system_effect.EFFECT_PARAM_LEVEL], is_num = True)
        effect_param = effect_param_level_dict.get(cur_level, 0)
    else:
        effect_param = effect_config[use_tb.EFFECT_PARAM] * cur_level * 1 / max_level
    effect_type = weapon_num_attr[cfg_weapon_num_attr.EFFECT_TYPE]
    if effect_type == 'ratio_add':
        add_ratio = add_ratio + effect_param
    elif effect_type == 'ratio_del':
        add_ratio = add_ratio - effect_param
    elif effect_type == 'num_add':
        add_num = add_num + effect_param
    elif effect_type == 'num_del':
        add_num = add_num - effect_param
    elif effect_type == 'base_num_add':
        add_base_num = add_base_num + effect_param
    elif effect_type == 'base_num_del':
        add_base_num = add_base_num - effect_param
if effect_id == CfgModuleEffectField.Effect.EFFECT_SHIP_HP:
    ratio = 100
else:
    ratio = 1
if is_system_effect:
    system_effect_id = effect_info.system_effect_id
    system_prefix_to_enhance_id_map = get_system_prefix_to_enhance_catagory_map()
    enhance_catagory = system_prefix_to_enhance_id_map.get(system_effect_id // 100, ENHANCE_CATAGORY_OTHER)
    enhance_name = Tb_cfg_system_effect.get((system_effect_id // 100) * 100 + 1)[Tb_cfg_system_effect.NAME]
else:
    enhance_catagory = ENHANCE_CATAGORY_MODULE
    enhance_name = effect_config[use_tb.NAME]
fomatter_dict = {
    ENHANCE_CATAGORY_MODULE: language.SHIP_BLUEPRINT_MODULE_ENHANCE_DETAIL_FORMAT,
    ENHANCE_CATAGORY_ADJUSTMENT: language.SHIP_BLUEPRINT_ADJUSTMENT_ENHANCE_DETAIL_FORMAT,
    ENHANCE_CATAGORY_SYSTEM: language.SHIP_BLUEPRINT_SYSTEM_ENHANCE_DETAIL_FORMAT }
enhance_name_formatter = fomatter_dict.get(enhance_catagory, '{}')
return EffectAddInfo(add_base_num = add_base_num / ratio, add_num = add_num / ratio, add_ratio = add_ratio / ratio, enhance_catagory = enhance_catagory, enhance_name = enhance_name_formatter.format(enhance_name))
