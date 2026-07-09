# Source Generated with Decompyle++
# File: collect_skill_effect_ratio_info.pyc (Python 3.11)

skill_effect_ratio_info = []
if _module_id and _dps_type == common_definition.MA_MODULE_AIR_DPS:
    if _attr_type == 'Tb_cfg_weapon_action.DURATION':
        skill_effect_ratio_info += get_module_effect_ori_value_info(_module_id, CfgModuleEffectField.Effect.EFFECT_AIRCRAFT_WEAPON_DURATION_INC)
        skill_effect_ratio_info += get_module_effect_ori_value_info(_module_id, CfgModuleEffectField.Effect.EFFECT_AIRCRAFT_WEAPON_DURATION_DEC)
    elif _attr_type == 'Tb_cfg_weapon.CD_TIME':
        skill_effect_ratio_info += get_module_effect_ori_value_info(_module_id, CfgModuleEffectField.Effect.EFFECT_AIRCRAFT_CD_TIME_INC)
        skill_effect_ratio_info += get_module_effect_ori_value_info(_module_id, CfgModuleEffectField.Effect.EFFECT_AIRCRAFT_CD_TIME_DEC)
return skill_effect_ratio_info
