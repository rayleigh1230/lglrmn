# Source Generated with Decompyle++
# File: get_building_cam_distance.pyc (Python 3.11)

ctrl_ctr_record = get_facility_of_building(building_id_u, CfgFacilityField.Fid.FID_CENTER)
lv = len(ZOOM0_BUILDING_CAM_DISTANCE) - 1
if ctrl_ctr_record:
    lv = ctrl_ctr_record[FacilityField.LEVEL] - 1
lv = sorted((0, len(ZOOM0_BUILDING_CAM_DISTANCE) - 1, lv))[1]
return float(ZOOM0_BUILDING_CAM_DISTANCE[lv]) * ZOOM0_MODEL_SCALE
