# Source Generated with Decompyle++
# File: get_table_for_unique_key.pyc (Python 3.11)

table_data = self._game_table_dict.get(table_name)
ret = { }
if table_data:
    for record in six.itervalues(table_data):
        ret[record[unique_key_name]] = record
        return ret
