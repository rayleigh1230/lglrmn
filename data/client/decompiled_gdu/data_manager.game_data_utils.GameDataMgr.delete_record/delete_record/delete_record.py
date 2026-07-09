# Source Generated with Decompyle++
# File: delete_record.pyc (Python 3.11)

table_data = self._game_table_dict.get(table_name)
if table_data:
    if table_name == 'ship':
        print('[ship] delete_record:', table_name, key, key in table_data)
    if key in table_data:
        if table_name in TableSubKey:
            for table_sub_key in TableSubKey[table_name]:
                self.delete_sub_key_table(table_name, table_sub_key, table_data[key][table_sub_key], key)
                deleted_date = table_data[key]
                del table_data[key]
                if notify:
                    notify_event = ((table_name, protocol.DEL_DATA_NOTIFY), key, deleted_date)
                    self.data_event_mgr.notify_data_events((notify_event,))
        return ((table_name, protocol.DEL_DATA_NOTIFY), key, deleted_date)
    None._logger.warning('No record:{} in table:{}'.format(key, table_name))
    return None
self._logger.warning('No such table:{}'.format(table_name))
import traceback
traceback.print_stack()
