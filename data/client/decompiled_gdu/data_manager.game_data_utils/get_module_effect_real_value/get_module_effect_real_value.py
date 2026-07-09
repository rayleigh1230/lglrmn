# Source Generated with Decompyle++
# File: get_module_effect_real_value.pyc (Python 3.11)

CfgModuleEffectField = CfgModuleEffectField
import common.config.table_definition
if effect_id == CfgModuleEffectField.Effect.EFFECT_CARRIER:
    return effect_param % 100
if None == CfgModuleEffectField.Effect.EFFECT_DRONE:
    return effect_param % 100
if None == CfgModuleEffectField.Effect.EFFECT_AVOID_INC_BY_WEAPON_TYPE:
    return effect_param % 1000
if None == CfgModuleEffectField.Effect.EFFECT_HIT_RATE_INC_BY_TYPE:
    return effect_param % 1000
if None == CfgModuleEffectField.Effect.EFFECT_TARGET_PRIORITY_TOP:
    return effect_param % 1000
if None == CfgModuleEffectField.Effect.EFFECT_ANTI_MISSILE_BASE:
    return effect_param % 1000
if None == CfgModuleEffectField.Effect.EFFECT_ANTI_MISSILE_INC:
    return effect_param % 1000
if None == CfgModuleEffectField.Effect.EFFECT_DESTROY_INC:
    return effect_param
if None == CfgModuleEffectField.Effect.EFFECT_AIRCRAFT_INC:
    return effect_param
if None == CfgModuleEffectField.Effect.EFFECT_POWER_DESTROY_MORIBUND_SEQ:
    return 0
if None == CfgModuleEffectField.Effect.EFFECT_AIRCRAFT_WEAPON_ATTKACK_SUB:
    return -effect_param
if None == CfgModuleEffectField.Effect.EFFECT_AIRCRAFT_WEAPON_DURATION_INC:
    return effect_param
if None == CfgModuleEffectField.Effect.EFFECT_AIRCRAFT_WEAPON_DURATION_DEC:
    return -effect_param
if None == CfgModuleEffectField.Effect.EFFECT_AIRCRAFT_CD_TIME_INC:
    return effect_param
if None == CfgModuleEffectField.Effect.EFFECT_AIRCRAFT_CD_TIME_DEC:
    return -effect_param
if None == CfgModuleEffectField.Effect.EFFECT_SHIP_HP:
    return effect_param / 100
if None == effect_def.EffectId.Normal.EFFECT_ACCELERATION_AND_LIMIT:
    return effect_param
if None == effect_def.EffectId.Normal.EFFECT_ACCOMPANY_DRONE:
    return effect_param % 10
if None == effect_def.EffectId.Normal.EFFECT_SUPPORT_SHIP_EXPLOIT_SPEED:
    return effect_param / 5000
