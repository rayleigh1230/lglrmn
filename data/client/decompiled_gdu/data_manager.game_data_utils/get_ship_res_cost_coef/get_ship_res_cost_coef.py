# Source Generated with Decompyle++
# File: get_ship_res_cost_coef.pyc (Python 3.11)

lagrange_asset_effect_utils = lagrange_asset_effect_utils
import data_manager
ship_cfg = Tb_cfg_ship.get(ship_id)
ship_type = ship_cfg[Tb_cfg_ship.SHIP_TYPE]
ship_company = ship_cfg[Tb_cfg_ship.COMPANY_ID]
ship_flags = lagrange_asset_effect_utils.get_ship_flag_set(ship_id)
my_data = {
    lagrange_asset_effect_config.StaticEffectField.CONDITION_EFFECT_HARBOR_PER: lagrange_asset_effect_utils.get_harbour_percent(),
    lagrange_asset_effect_config.StaticEffectField.CONDITION_EFFECT_IDLE_BELTLINE: lagrange_asset_effect_utils.get_free_beltlines(facility_id),
    lagrange_asset_effect_config.StaticEffectField.CONDITION_EFFECT_FACILITY_ID: facility_id,
    lagrange_asset_effect_config.StaticEffectField.CONDITION_EFFECT_SHIP_FLAG: ship_flags,
    lagrange_asset_effect_config.StaticEffectField.CONDITION_EFFECT_COMPANY: ship_company,
    lagrange_asset_effect_config.StaticEffectField.CONDITION_EFFECT_SHIP_TYPE: ship_type }
coef_metal_dec = 1 - lagrange_asset_effect_utils.get_global_effect_param(effect_def.EffectId.Base.PRODUCE_METAL_DEC, my_data) / 10000
coef_crystal_dec = 1 - lagrange_asset_effect_utils.get_global_effect_param(effect_def.EffectId.Base.PRODUCE_CRYSTAL_DEC, my_data) / 10000
coef_deuterium_dec = 1 - lagrange_asset_effect_utils.get_global_effect_param(effect_def.EffectId.Base.PRODUCE_DEUTERIUM_DEC, my_data) / 10000
coef_all_dec = 1 - lagrange_asset_effect_utils.get_global_effect_param(effect_def.EffectId.Base.PRODUCE_BASIC_DEC, my_data) / 10000
coef_metal_inc = lagrange_asset_effect_utils.get_global_effect_param(effect_def.EffectId.Base.PRODUCE_METAL_INC, my_data) / 10000
coef_crystal_inc = lagrange_asset_effect_utils.get_global_effect_param(effect_def.EffectId.Base.PRODUCE_CRYSTAL_INC, my_data) / 10000
coef_deuterium_inc = lagrange_asset_effect_utils.get_global_effect_param(effect_def.EffectId.Base.PRODUCE_DEUTERIUM_INC, my_data) / 10000
coef_all_inc = lagrange_asset_effect_utils.get_global_effect_param(effect_def.EffectId.Base.PRODUCE_BASIC_INC, my_data) / 10000
to_ten_thousand_percent_ratio = to_ten_thousand_percent_ratio
import common.blueprint_utils
return [
    [
        to_ten_thousand_percent_ratio(coef_metal_dec * coef_all_dec),
        to_ten_thousand_percent_ratio(coef_crystal_dec * coef_all_dec),
        to_ten_thousand_percent_ratio(coef_deuterium_dec * coef_all_dec)],
    [
        to_ten_thousand_percent_ratio(coef_metal_inc + coef_all_inc),
        to_ten_thousand_percent_ratio(coef_crystal_inc + coef_all_inc),
        to_ten_thousand_percent_ratio(coef_deuterium_inc + coef_all_inc)]]
