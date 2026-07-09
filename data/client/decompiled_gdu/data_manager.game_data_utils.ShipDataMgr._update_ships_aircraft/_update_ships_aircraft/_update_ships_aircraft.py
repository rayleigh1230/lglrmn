# Source Generated with Decompyle++
# File: _update_ships_aircraft.pyc (Python 3.11)

for ship_uid in ship_uid_list:
    ship_data = self._ship_data_dict.get(ship_uid, None)
    if ship_data:
        ship_data.update_aircraft()
    GameEventManager().notify('ship_aircraft_changed', list(ship_uid_list))
    return None
