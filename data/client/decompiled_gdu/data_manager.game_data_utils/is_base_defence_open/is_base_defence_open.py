# Source Generated with Decompyle++
# File: is_base_defence_open.pyc (Python 3.11)

self_facilities = get_building_facility(building_id_u)
fid_base_defence_system = CfgFacilityField.Fid.FID_BASE_DEFENCE_SYSTEM
if self_facilities and fid_base_defence_system in self_facilities:
    (facility_id_u, facility_record) = self_facilities[fid_base_defence_system]
    return facility_record[FacilityField.LEVEL] >= 1
