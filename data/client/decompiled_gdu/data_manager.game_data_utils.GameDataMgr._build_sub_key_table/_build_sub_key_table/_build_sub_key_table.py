# Source Generated with Decompyle++
# File: _build_sub_key_table.pyc (Python 3.11)

for table_id, table_sub_keys in six.iteritems(TableSubKey):
    for table_sub_key in table_sub_keys:
        new_table_name = '{}_TO_{}'.format(table_sub_key, table_id)
        if new_table_name in self._sub_key_table_dict:
            raise ValueError('Reduplicate sub key table name:{}'.format(new_table_name))
        self._sub_key_table_dict[new_table_name] = { }
        return None
