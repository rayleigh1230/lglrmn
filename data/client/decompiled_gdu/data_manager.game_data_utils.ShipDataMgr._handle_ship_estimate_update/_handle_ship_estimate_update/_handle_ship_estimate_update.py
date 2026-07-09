# Source Generated with Decompyle++
# File: _handle_ship_estimate_update.pyc (Python 3.11)

if SHIP_HP_CUR in update_record:
    ship_uid = update_record[ShipField.SHIP_ID_U]
    ship_data = self.get(ship_uid)
    if ship_data:
        ship_data.health = update_record[SHIP_HP_CUR]
        return None
    return None
