# Source Generated with Decompyle++
# File: has_facility_upgrading.pyc (Python 3.11)

facility_dict = get_building_facility(building_id)
for facility_id_u, facility_record in six.iteritems(facility_dict):
    if facility_record[FacilityField.STATE] in (FacilityField.State.STATE_UPGRADING, FacilityField.State.STATE_BUILDING):
        return True
    return False
