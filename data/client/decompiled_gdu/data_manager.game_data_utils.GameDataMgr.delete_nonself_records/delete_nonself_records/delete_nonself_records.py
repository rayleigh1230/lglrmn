# Source Generated with Decompyle++
# File: delete_nonself_records.pyc (Python 3.11)

notify_data = []
for table_id, table_date in six.iteritems(self._game_table_dict):
    table_field = TableMap.get(table_id)
    if table_field:
        if hasattr(table_field, 'USER_ID_KEY') and table_field.USER_ID_KEY:
            delete_record_ids = []
            user_id_key = table_field.USER_ID_KEY
            for r_id, record in six.iteritems(table_date):
                if record[user_id_key] != self.user_id:
                    delete_record_ids.append(r_id)
                for r_id in delete_record_ids:
                    notify_data.append(self.delete_record(table_id, r_id))
                    self._logger.error('table {} has no field map'.format(table_id))
                    self.data_event_mgr.notify_data_events(notify_data)
                    return None
