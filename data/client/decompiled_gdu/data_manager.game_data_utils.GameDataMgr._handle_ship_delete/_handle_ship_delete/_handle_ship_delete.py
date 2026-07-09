# Source Generated with Decompyle++
# File: _handle_ship_delete.pyc (Python 3.11)

notify_data = None
if ship_id_u in self._game_table_dict[SHIP_ESTIMATE]:
    notify_data = self.delete_record(SHIP_ESTIMATE, ship_id_u)
return notify_data
