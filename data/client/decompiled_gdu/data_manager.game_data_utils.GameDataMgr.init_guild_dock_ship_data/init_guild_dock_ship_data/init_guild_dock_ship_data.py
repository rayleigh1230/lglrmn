# Source Generated with Decompyle++
# File: init_guild_dock_ship_data.pyc (Python 3.11)

self.shipyard_fix_info[world_item_id] = guild_info
self.shipyard_ship_uids[world_item_id] = set()
notify_data = []
for ship_record in data:
    ship_id_u = ship_record[ShipField.SHIP_ID_U]
    self.shipyard_ship_uids[world_item_id].add(ship_id_u)
    if self.get_record(TableID.SHIP, ship_id_u):
        notify_data.append(self.update_record(TableID.SHIP, ship_record[ShipField.SHIP_ID_U], ship_record))
        continue
    notify_data.append(self.insert_record(TableID.SHIP, ship_record[ShipField.SHIP_ID_U], ship_record))
    DataEventMgr().notify_data_events(notify_data)
    return None
