# Source Generated with Decompyle++
# File: _insert_ship.pyc (Python 3.11)

self._update_ship_data(ship_uid)
team_data = self.get_team_data(team_id)
if team_data:
    team_data.handle_add_ship(ship_uid)
    return None
