# Source Generated with Decompyle++
# File: update_ship_record_on_exit_manoeuvre_scene.pyc (Python 3.11)

ship_data = self._ship_data_dict.get(ship_uid, None)
if ship_data:
    if ShipField.HP in update_record:
        ship_data.health = update_record[ShipField.HP]
    if ShipField.HP_MAX in update_record:
        ship_data.health_max = update_record[ShipField.HP_MAX]
        return None
    return None
