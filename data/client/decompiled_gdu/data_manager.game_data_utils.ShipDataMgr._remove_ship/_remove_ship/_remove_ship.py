# Source Generated with Decompyle++
# File: _remove_ship.pyc (Python 3.11)

team_data = self.get_team_data(team_id)
if team_data:
    team_data.handle_remove_ship(ship_uid)
if ship_uid in self._ship_data_dict:
    del self._ship_data_dict[ship_uid]
    return None
