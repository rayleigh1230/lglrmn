# Source Generated with Decompyle++
# File: get_base_facility_total_level_new.pyc (Python 3.11)

level = 0
for cur_facility_id in (CfgFacilityField.Fid.FID_CENTER_AREA_SIZE, CfgFacilityField.Fid.FID_GANG_QU_SIZE, CfgFacilityField.Fid.FID_INDUSTRIAL_AREA_SIZE):
    level += get_facility_current_level(cur_facility_id)
    return level
