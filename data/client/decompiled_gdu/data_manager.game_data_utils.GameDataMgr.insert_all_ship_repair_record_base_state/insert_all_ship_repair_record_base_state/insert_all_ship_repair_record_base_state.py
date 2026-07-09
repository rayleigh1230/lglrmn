# Source Generated with Decompyle++
# File: insert_all_ship_repair_record_base_state.pyc (Python 3.11)

notify_data = []
table = self.get_table(TableID.SHIP)
for ship_id, ship_record in six.iteritems(table):
    if self._is_need_reform(ship_record):
        ship_id_u = ship_record[ShipField.SHIP_ID_U]
        self.insert_record(SHIP_REFORM, ship_id_u, {
            ShipField.REFORMING_END_TIME: ship_record[ShipField.REFORMING_END_TIME],
            ShipField.SHIP_ID_U: ship_id_u })
    notify_data.append(self.insert_ship_repair(ship_record))
    if notify_data:
        self.data_event_mgr.notify_data_events(notify_data, True)
        return None
    return None
