# Source Generated with Decompyle++
# File: get_facility_support_max_res.pyc (Python 3.11)

res_dict = {
    141: 0,
    142: 0,
    143: 0 }
self_building_facility = get_building_facility(building_id)
for facility_id_u, facility_record in six.iteritems(self_building_facility):
    cfg = m0_utils.get_facility_level_cfg(facility_id, facility_record[FacilityField.LEVEL])
    effects = parse_cfg_str_to_dict_of_list(cfg[Tb_cfg_facility_level_ex.EFFECTS], True)
    for effect_id in list(res_dict.keys()):
        if effect_id in effects:
            pass
        collections.OrderedDict() = None
        r[CfgResDefField.ResId.RES_ID_METAL] = res_dict[141]
        r[CfgResDefField.ResId.RES_ID_CRYSTAL] = res_dict[142]
        r[CfgResDefField.ResId.RES_ID_DEUTERIUM] = res_dict[143]
        return r
