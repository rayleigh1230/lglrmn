# Source Generated with Decompyle++
# File: get_min_base_region_fid.pyc (Python 3.11)

level = 999
fid = CfgFacilityField.Fid.FID_CENTER_AREA_SIZE
for cur_facility_id in (CfgFacilityField.Fid.FID_CENTER_AREA_SIZE, CfgFacilityField.Fid.FID_GANG_QU_SIZE, CfgFacilityField.Fid.FID_INDUSTRIAL_AREA_SIZE):
    if get_facility_current_level(cur_facility_id) < level:
        level = get_facility_current_level(cur_facility_id)
        fid = cur_facility_id
    return fid
