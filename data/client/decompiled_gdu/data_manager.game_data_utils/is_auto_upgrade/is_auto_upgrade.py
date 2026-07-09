# Source Generated with Decompyle++
# File: is_auto_upgrade.pyc (Python 3.11)

facility_record = GameDataMgr().get_record(TableID.FACILITY, facility_id_u)
max_level = None
if facility_record:
    facility_cfg_record = Tb_cfg_facility.get(facility_record[FacilityField.FACILITY_ID])
    max_level = facility_cfg_record[Tb_cfg_facility.LEVEL_MAX] if facility_cfg_record else None

def _can_upgrade_to_next_level():
    if max_level:
        return True
    if not None:
        return True
    current_level = None[FacilityField.LEVEL]
    return current_level + 1 <= max_level

if facility_record and FacilityField.AUTO_LEVEL in facility_record:
    if not is_updating:
        return False
    auto_level = None[FacilityField.AUTO_LEVEL]
    current_level = facility_record[FacilityField.LEVEL]
    if auto_level <= current_level:
        return False
    return _can_upgrade_to_next_level()
if None:
    return _can_upgrade_to_next_level()
