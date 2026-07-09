# Source Generated with Decompyle++
# File: insert_sub_key_table.pyc (Python 3.11)

sub_key_table = self.get_sub_key_table(table_id, sub_key_name)
if sub_key_table:
    if sub_key_value not in sub_key_table:
        sub_key_table[sub_key_value] = set()
    sub_key_table[sub_key_value].add(table_id_value)
    return None
