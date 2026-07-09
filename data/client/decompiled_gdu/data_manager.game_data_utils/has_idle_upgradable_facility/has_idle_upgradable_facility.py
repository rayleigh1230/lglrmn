# Source Generated with Decompyle++
# File: has_idle_upgradable_facility.pyc (Python 3.11)

_EXCLUDED_FIDS = (CfgFacilityField.Fid.FID_CENTER_AREA_NEW, CfgFacilityField.Fid.FID_GANG_QU_NEW, CfgFacilityField.Fid.FID_INDUSTRIAL_AREA_NEW)
_SIZE_FIDS = (CfgFacilityField.Fid.FID_CENTER_AREA_SIZE, CfgFacilityField.Fid.FID_GANG_QU_SIZE, CfgFacilityField.Fid.FID_INDUSTRIAL_AREA_SIZE)
_UPDATING_STATES = (FacilityField.State.STATE_UPGRADING, FacilityField.State.STATE_BUILDING)
my_building_id = get_player_base_building_id()
if not my_building_id:
    return False
self_facilities = None(my_building_id)
for _, facility_record in self_facilities.items():
    if is_sub_facility(facility_id):
        continue
    if facility_id in _EXCLUDED_FIDS:
        continue
    facility_state = facility_record[FacilityField.STATE]
    if facility_state in _UPDATING_STATES:
        continue
    if facility_id in _SIZE_FIDS:
        if get_facility_level(facility_id) < get_base_facility_max_level():
            return True
    if not is_fully_updated(facility_id):
        return True
    return False
