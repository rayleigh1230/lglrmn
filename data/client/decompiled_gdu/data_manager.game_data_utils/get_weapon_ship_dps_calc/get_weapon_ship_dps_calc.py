# Source Generated with Decompyle++
# File: get_weapon_ship_dps_calc.pyc (Python 3.11)

BlueprintAttrCalc = BlueprintAttrCalc
import data.ship_attr_calc
ship_id = slot_id / CfgShipField.Prefix.PREFIX_SHIP_ID_TO_SLOT
bp_attr_calc_obj = BlueprintAttrCalc.create_prepared(ship_id, enhancements, modules)
calc = bp_attr_calc_obj.get_module_total_dps_calc(slot_id, module_id, common_definition.MA_SHIP_DPS)
return calc
