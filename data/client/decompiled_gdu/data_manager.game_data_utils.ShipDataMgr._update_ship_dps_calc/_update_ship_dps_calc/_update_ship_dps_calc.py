# Source Generated with Decompyle++
# File: _update_ship_dps_calc.pyc (Python 3.11)

ship_data = self._ship_data_dict.get(ship_uid, None)
if ship_data:
    ship_data.update_dps_calc()
    return None
