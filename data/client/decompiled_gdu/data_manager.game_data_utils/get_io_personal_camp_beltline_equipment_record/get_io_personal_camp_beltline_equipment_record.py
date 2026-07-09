# Source Generated with Decompyle++
# File: get_io_personal_camp_beltline_equipment_record.pyc (Python 3.11)

equip_table = GameDataMgr().get_table(TableID.USER_EQUIPMENT)
for record in six.itervalues(equip_table):
    if record[UserEquipmentField.CFG_EQUIPMENT_ID] == configdata.IO_SINGLE_CAMP_BELTLINE_EQUIPMENT_ID:
        
        return None, record
    return None
