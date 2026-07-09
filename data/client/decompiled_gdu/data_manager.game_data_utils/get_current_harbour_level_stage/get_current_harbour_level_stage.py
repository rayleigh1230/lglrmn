# Source Generated with Decompyle++
# File: get_current_harbour_level_stage.pyc (Python 3.11)

fid_lst = (CfgFacilityField.Fid.FID_BASIC_BERTH, CfgFacilityField.Fid.FID_MAIN_SHIP_BERTH, CfgFacilityField.Fid.FID_MILITARY_BERTH_II)
cur_id = fid_lst[0]
cur_level = 1
for fid in fid_lst:
    facility_record = get_facility_of_building(building_id_u, fid)
    if not facility_record:
        
        return None, (cur_id, cur_level)
    facility_record[FacilityField.LEVEL] = None
    return (cur_id, cur_level)
