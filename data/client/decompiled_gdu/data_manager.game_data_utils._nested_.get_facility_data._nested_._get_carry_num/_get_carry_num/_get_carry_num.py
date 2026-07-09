# Source Generated with Decompyle++
# File: _get_carry_num.pyc (Python 3.11)

(facility_id_u, facility_record) = self_facilities[facility_id]
level = facility_record[FacilityField.LEVEL]
next_level_cfg = m0_utils.get_facility_level_cfg(facility_id, level)
effects = parse_cfg_str_to_dict_of_list(next_level_cfg[Tb_cfg_facility_level_ex.EFFECTS], is_num = True)
return (effects.get(121, 0), level)
