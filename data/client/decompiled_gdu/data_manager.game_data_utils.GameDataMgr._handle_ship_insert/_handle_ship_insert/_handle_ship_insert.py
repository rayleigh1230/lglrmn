# Source Generated with Decompyle++
# File: _handle_ship_insert.pyc (Python 3.11)

ship_id_u = ship_record[ShipField.SHIP_ID_U]
notify_data = self.insert_ship_repair(ship_record)
if self._is_need_reform(ship_record):
    self.insert_record(SHIP_REFORM, ship_id_u, {
        ShipField.REFORMING_END_TIME: ship_record[ShipField.REFORMING_END_TIME],
        ShipField.SHIP_ID_U: ship_id_u })
return notify_data
