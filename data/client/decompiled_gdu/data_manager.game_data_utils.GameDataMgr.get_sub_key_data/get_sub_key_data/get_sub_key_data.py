# Source Generated with Decompyle++
# File: get_sub_key_data.pyc (Python 3.11)

sub_key_table = self.get_sub_key_table(table_id, sub_key_name)
if sub_key_table:
    return sub_key_table.get(sub_key_value, set())
return None()
