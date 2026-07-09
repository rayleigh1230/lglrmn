# Source Generated with Decompyle++
# File: insert_all_ship_repair_record_after_module_load_finished.pyc (Python 3.11)

notify_data = []
table = self.get_table(TableID.SHIP)
for ship_id, ship_record in six.iteritems(table):
    notify_data.append(self.insert_ship_repair(ship_record))
    if notify_data:
        self.data_event_mgr.notify_data_events(notify_data)
        return None
    return None
