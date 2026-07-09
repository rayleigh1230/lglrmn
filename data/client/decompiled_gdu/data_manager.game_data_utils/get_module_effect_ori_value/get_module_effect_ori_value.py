# Source Generated with Decompyle++
# File: get_module_effect_ori_value.pyc (Python 3.11)

if module_id not in BLUEPRINT_MODULE_EFFECT:
    return 0
v = None
for effect_config in BLUEPRINT_MODULE_EFFECT[module_id]:
    if effect_config[Tb_cfg_module_effect.EFFECT_ID] == effect_type:
        effect_param = effect_config[Tb_cfg_module_effect.EFFECT_PARAM]
        v += get_module_effect_real_value(effect_type, effect_param)
    return v
