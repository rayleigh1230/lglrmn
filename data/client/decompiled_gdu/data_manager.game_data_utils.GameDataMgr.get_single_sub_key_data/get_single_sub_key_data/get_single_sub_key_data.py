# Source Generated with Decompyle++
# File: get_single_sub_key_data.pyc (Python 3.11)

if use_sub_key_data:
    sub_key_table = self.get_sub_key_table(table_id, sub_key_name)
    key_set = sub_key_table.get(sub_key_value, set())
    if key_set:
        one_key = next(iter(key_set))
        return self.get_record(table_id, one_key)
    return None
for sub_record in None.itervalues(self.get_table(table_id)):
    if sub_record[sub_key_name] == sub_key_value:
        
        return None, sub_record
    return None
