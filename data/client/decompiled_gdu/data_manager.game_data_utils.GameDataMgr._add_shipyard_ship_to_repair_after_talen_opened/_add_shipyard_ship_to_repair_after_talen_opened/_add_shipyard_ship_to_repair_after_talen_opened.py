# Source Generated with Decompyle++
# File: _add_shipyard_ship_to_repair_after_talen_opened.pyc (Python 3.11)

estimate_table = self.get_table(SHIP_ESTIMATE)
notify_data = []
for world_item_id, ship_set in six.iteritems(self.shipyard_ship_uids):
    for ship_id_u in ship_set:
        if ship_id_u in estimate_table:
            continue
        ship_record = GameDataMgr().get_record(TableID.SHIP, ship_id_u)
        if ship_record:
            notify_data.append(self.insert_ship_repair(ship_record))
        if notify_data:
            self.data_event_mgr.notify_data_events(notify_data)
            return None
        return None
