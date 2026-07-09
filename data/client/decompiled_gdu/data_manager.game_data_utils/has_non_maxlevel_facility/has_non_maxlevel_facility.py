# Source Generated with Decompyle++
# File: has_non_maxlevel_facility.pyc (Python 3.11)

_EXCLUDED_FIDS = (CfgFacilityField.Fid.FID_CENTER_AREA_NEW, CfgFacilityField.Fid.FID_GANG_QU_NEW, CfgFacilityField.Fid.FID_INDUSTRIAL_AREA_NEW, CfgFacilityField.Fid.FID_CENTER_AREA_SIZE, CfgFacilityField.Fid.FID_GANG_QU_SIZE, CfgFacilityField.Fid.FID_INDUSTRIAL_AREA_SIZE)
my_building_id = get_player_base_building_id()
if not my_building_id:
    return False
self_facilities = None(my_building_id)
for _, facility_record in self_facilities.items():
    if is_sub_facility(facility_id):
        continue
    if facility_id in _EXCLUDED_FIDS:
        continue
    cfg = Tb_cfg_facility.get(facility_id)
    if not cfg:
        continue
    cur_level = get_facility_current_level(facility_id)
    max_level = cfg[Tb_cfg_facility.LEVEL_MAX]
    if cur_level < max_level:
        return True
    return False
