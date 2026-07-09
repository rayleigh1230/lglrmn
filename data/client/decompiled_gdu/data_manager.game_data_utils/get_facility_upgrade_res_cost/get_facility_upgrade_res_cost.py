# Source Generated with Decompyle++
# File: get_facility_upgrade_res_cost.pyc (Python 3.11)

get_global_effect_param = get_global_effect_param
import data_manager.lagrange_asset_effect_utils
facility_region = FACILITY_SUB_LEVEL_DICT.get(facility_id, 0)
all_coef_dec = get_global_effect_param([
    effect_def.EffectId.Base.FACILITY_METAL_DEC,
    effect_def.EffectId.Base.FACILITY_CRYSTAL_DEC,
    effect_def.EffectId.Base.FACILITY_DEUTERIUM_DEC], {
    lagrange_asset_effect_config.StaticEffectField.CONDITION_EFFECT_FACILITY_ID: facility_id,
    lagrange_asset_effect_config.StaticEffectField.CONDITION_EFFECT_FACILITY_REGION: facility_region })
total_coef_dec = get_global_effect_param(effect_def.EffectId.Base.FACILITY_BASIC_DEC, {
    lagrange_asset_effect_config.StaticEffectField.CONDITION_EFFECT_FACILITY_ID: facility_id,
    lagrange_asset_effect_config.StaticEffectField.CONDITION_EFFECT_FACILITY_REGION: facility_region })
all_coef_inc = get_global_effect_param([
    effect_def.EffectId.Base.FACILITY_METAL_INC,
    effect_def.EffectId.Base.FACILITY_CRYSTAL_INC,
    effect_def.EffectId.Base.FACILITY_DEUTERIUM_INC], {
    lagrange_asset_effect_config.StaticEffectField.CONDITION_EFFECT_FACILITY_ID: facility_id,
    lagrange_asset_effect_config.StaticEffectField.CONDITION_EFFECT_FACILITY_REGION: facility_region })
total_coef_inc = get_global_effect_param(effect_def.EffectId.Base.FACILITY_BASIC_INC, {
    lagrange_asset_effect_config.StaticEffectField.CONDITION_EFFECT_FACILITY_ID: facility_id,
    lagrange_asset_effect_config.StaticEffectField.CONDITION_EFFECT_FACILITY_REGION: facility_region })
ret = { }
ori_cost = parse_facility_level_res_cost(cfg_res_cost)
for res_id, res_num in six.iteritems(ori_cost):
    if res_id in (1, 2, 3):
        res_coef_dec = all_coef_dec[res_id - 1]
        res_coef_inc = all_coef_inc[res_id - 1]
        ratio = (1 - res_coef_dec * 1 / 10000) * (1 - total_coef_dec * 1 / 10000) + res_coef_inc * 1 / 10000 + total_coef_inc * 1 / 10000
        ret[res_id] = int(res_num * ratio)
        continue
    ret[res_id] = res_num
    return ret
