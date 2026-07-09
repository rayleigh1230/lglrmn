# Source Generated with Decompyle++
# File: get_base_defence_next_level_num.pyc (Python 3.11)


def get_facility_data():
    self_facilities = get_building_facility(building_id_u)
    facility_cfg_record = Tb_cfg_facility.get(CfgFacilityField.Fid.FID_BASE_DEFENCE_SYSTEM)
    max_level = facility_cfg_record[Tb_cfg_facility.LEVEL_MAX]
    
    def _get_carry_num(facility_id = None):
        (facility_id_u, facility_record) = self_facilities[facility_id]
        level = facility_record[FacilityField.LEVEL]
        next_level_cfg = m0_utils.get_facility_level_cfg(facility_id, level)
        effects = parse_cfg_str_to_dict_of_list(next_level_cfg[Tb_cfg_facility_level_ex.EFFECTS], is_num = True)
        return (effects.get(121, 0), level)

    if self_facilities and CfgFacilityField.Fid.FID_BASE_DEFENCE_SYSTEM in self_facilities:
        (cur_max_carry_num, level) = _get_carry_num(CfgFacilityField.Fid.FID_BASE_DEFENCE_SYSTEM)
    else:
        level = 0
        cur_max_carry_num = 0
    if self_facilities:
        if 314 in self_facilities:
            (max_carry_num, _) = _get_carry_num(314)
            cur_max_carry_num += max_carry_num
        elif 315 in self_facilities:
            (max_carry_num, _) = _get_carry_num(315)
            cur_max_carry_num += max_carry_num
# WARNING: Decompyle incomplete

(facility_num, facility_max_level) = get_facility_data()
get_global_effect_param = get_global_effect_param
import data_manager.lagrange_asset_effect_utils
extra_effect_dict = get_global_effect_param(effect_def.EffectId.Base.FACILITY_EFFECT)
if extra_effect_dict and 121 in extra_effect_dict:
    facility_num += extra_effect_dict[121]
sub_facility_records = get_sub_facility_records(CfgFacilityField.Fid.FID_BASE_DEFENCE_SYSTEM)
for sub_facility_id, sub_facility_record in six.iteritems(sub_facility_records):
    level = sub_facility_record[FacilityField.LEVEL]
    facility_level_cfg = m0_utils.get_facility_level_cfg(sub_facility_id, level)
    effects = parse_cfg_str_to_dict_of_list(facility_level_cfg[Tb_cfg_facility_level_ex.EFFECTS], is_num = True)
    facility_num += effects.get(121, 0)
    return (facility_num, facility_max_level)
