# Source Generated with Decompyle++
# File: update_sub_key_table.pyc (Python 3.11)

self.insert_sub_key_table(table_id, sub_key_name, sub_key_new_value, table_id_value)
if sub_key_old_value:
    self.delete_sub_key_table(table_id, sub_key_name, sub_key_old_value, table_id_value)
    return None
None._logger.warning('sub_key_old_value is None, t_id:{}, s_k_name:{}'.format(table_id, sub_key_name))
