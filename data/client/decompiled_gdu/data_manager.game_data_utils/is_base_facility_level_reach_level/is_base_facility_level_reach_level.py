# Source Generated with Decompyle++
# File: is_base_facility_level_reach_level.pyc (Python 3.11)

for cur_facility_id in (CfgFacilityField.Fid.FID_CENTER_AREA_SIZE, CfgFacilityField.Fid.FID_GANG_QU_SIZE, CfgFacilityField.Fid.FID_INDUSTRIAL_AREA_SIZE):
    if get_facility_current_level(cur_facility_id) < level:
        return False
    return True
