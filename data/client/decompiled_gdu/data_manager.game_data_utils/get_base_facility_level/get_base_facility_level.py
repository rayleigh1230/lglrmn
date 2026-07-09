# Source Generated with Decompyle++
# File: get_base_facility_level.pyc (Python 3.11)

level = -1
region = None
for cur_facility_id in (CfgFacilityField.Fid.FID_CENTER_AREA_SIZE, CfgFacilityField.Fid.FID_GANG_QU_SIZE, CfgFacilityField.Fid.FID_INDUSTRIAL_AREA_SIZE):
    if get_facility_current_level(cur_facility_id) > level:
        level = get_facility_current_level(cur_facility_id)
        region = cur_facility_id
    if with_id:
        return (level, region)
    return None
