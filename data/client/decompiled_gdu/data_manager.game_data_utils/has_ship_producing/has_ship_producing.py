# Source Generated with Decompyle++
# File: has_ship_producing.pyc (Python 3.11)

beltline_table = GameDataMgr().get_table(TableID.BELTLINE)
for belt_record in six.itervalues(beltline_table):
    if belt_record[BeltlineField.USERID] == GameDataMgr().user_id and belt_record[BeltlineField.STATE] == BeltlineField.State.STATE_PRODUCING and belt_record[BeltlineField.WID] == building_id:
        return True
    return False
