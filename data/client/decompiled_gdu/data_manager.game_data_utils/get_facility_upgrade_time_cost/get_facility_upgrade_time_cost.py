# Source Generated with Decompyle++
# File: get_facility_upgrade_time_cost.pyc (Python 3.11)

get_global_effect_param = get_global_effect_param
import data_manager.lagrange_asset_effect_utils
facility_region = FACILITY_SUB_LEVEL_DICT.get(facility_id, 0)
coefs = get_global_effect_param([
    effect_def.EffectId.Base.FACILITY_TIME,
    effect_def.EffectId.Base.FACILITY_TIME_INC], {
    lagrange_asset_effect_config.StaticEffectField.CONDITION_EFFECT_FACILITY_ID: facility_id,
    lagrange_asset_effect_config.StaticEffectField.CONDITION_EFFECT_FACILITY_REGION: facility_region })
ratio = (1 - coefs[0] * 1 / 10000) + coefs[1] * 1 / 10000
if facility_id in (CfgFacilityField.Fid.FID_CENTER_AREA_SIZE, CfgFacilityField.Fid.FID_GANG_QU_SIZE, CfgFacilityField.Fid.FID_INDUSTRIAL_AREA_SIZE) and has_base_catch_up_buff():
    ratio *= configdata.SEASON_CATCH_UP_FREE_BASE_LLEVEL_UP_REDUCE_TIME_RATE / 100
return int(time_cost * ratio)
