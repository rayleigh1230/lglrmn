# Source Generated with Decompyle++
# File: get_system_effect_params.pyc (Python 3.11)

system_effect_cfg_id_list = SYSTEM_EFFECT_ENHANCE_DATA.get(system_effect_id)
param_list = []
for system_effect_id in system_effect_cfg_id_list:
    system_effect_cfg = Tb_cfg_system_effect.get(system_effect_id)
    if effect_id == system_effect_cfg[Tb_cfg_system_effect.EFFECT_ID]:
        param_list.append(system_effect_cfg[Tb_cfg_system_effect.EFFECT_PARAM])
    return param_list
