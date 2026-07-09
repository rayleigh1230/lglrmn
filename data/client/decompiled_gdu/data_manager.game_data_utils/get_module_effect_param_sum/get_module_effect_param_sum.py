# Source Generated with Decompyle++
# File: get_module_effect_param_sum.pyc (Python 3.11)

if module_id not in BLUEPRINT_MODULE_EFFECT:
    return None
high_value = None
low_value = 0
for effect_config in BLUEPRINT_MODULE_EFFECT[module_id]:
    if effect_config[Tb_cfg_module_effect.EFFECT_ID] == effect_type:
        effect_param = effect_config[Tb_cfg_module_effect.EFFECT_PARAM]
        if high_value == 0:
            high_value = int(int(effect_param) / 100)
        low_value += int(effect_param) % 100
    return high_value * 100 + low_value
