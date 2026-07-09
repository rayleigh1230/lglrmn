# Source Generated with Decompyle++
# File: handle_guild_dock_ship_add.pyc (Python 3.11)

if world_item_id in self.shipyard_ship_uids:
    for ship_record in ship_records:
        ship_id_u = ship_record[ShipField.SHIP_ID_U]
        self.shipyard_ship_uids[world_item_id].add(ship_id_u)
        return None
        return None
