# Source Generated with Decompyle++
# File: get_io_personal_camp_beltline_equipment_facility_record.pyc (Python 3.11)

equip_record = get_io_personal_camp_beltline_equipment_record()
if equip_record:
    facility_id_u = equip_record[UserEquipmentField.FACILITY_ID_U]
    facility_record = GameDataMgr().get_record(TableID.FACILITY, facility_id_u)
    return facility_record
