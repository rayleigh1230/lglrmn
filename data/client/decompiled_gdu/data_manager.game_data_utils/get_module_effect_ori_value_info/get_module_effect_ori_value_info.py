# Source Generated with Decompyle++
# File: get_module_effect_ori_value_info.pyc (Python 3.11)

ret = []
if module_id not in BLUEPRINT_MODULE_EFFECT:
    return ret
for effect_config in None[module_id]:
    if effect_config[Tb_cfg_module_effect.EFFECT_ID] == effect_type:
        effect_param = effect_config[Tb_cfg_module_effect.EFFECT_PARAM]
        effect = ModuleEffectAddInfo(value = get_module_effect_real_value(effect_type, effect_param), enhance_name = effect_config[Tb_cfg_module_effect.NAME])
        ret.append(effect)
    return ret
