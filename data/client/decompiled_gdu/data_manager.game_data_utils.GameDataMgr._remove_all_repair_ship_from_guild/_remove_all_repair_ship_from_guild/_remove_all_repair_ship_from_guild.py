# Source Generated with Decompyle++
# File: _remove_all_repair_ship_from_guild.pyc (Python 3.11)

estimate_table = self.get_table(SHIP_ESTIMATE)
for ship_id_u in list(estimate_table.keys()):
    if self.is_ship_in_shipyard(ship_id_u):
        self.delete_record(SHIP_ESTIMATE, ship_id_u, notify = True)
    return None
