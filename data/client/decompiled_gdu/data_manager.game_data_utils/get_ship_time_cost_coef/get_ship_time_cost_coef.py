# Source Generated with Decompyle++
# File: get_ship_time_cost_coef.pyc (Python 3.11)

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
decs = []
incs = []
lae_mgr = lagrange_asset_effect_utils.LagrangeAssetEffectMgr()
for equip_id, equip_record in six.iteritems(GameDataMgr().get_table(TableID.USER_EQUIPMENT)):
    if not equip_record[UserEquipmentField.INSTALL]:
        continue
    if not equip_record[UserEquipmentField.EFFECTS]:
        continue
    result1 = lae_mgr.get_equip_add_effect_data(equip_id, effect_def.EffectId.Base.PRODUCE_TIME_DEC, my_data)
    result2 = lae_mgr.get_equip_add_effect_data(equip_id, effect_def.EffectId.Base.PRODUCE_TIME_INC, my_data)
    decs.append(result1 * 0.0001)
    incs.append(result2 * 0.0001)
    return (decs, incs)
