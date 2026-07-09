# Source Generated with Decompyle++
# File: delete_sub_key_table.pyc (Python 3.11)

sub_key_table = self.get_sub_key_table(table_id, sub_key_name)
if sub_key_table or sub_key_value in sub_key_table:
    sub_key_table[sub_key_value].discard(table_id_value)
    if len(sub_key_table[sub_key_value]) <= 0:
        del sub_key_table[sub_key_value]
        return None
    return None
return None
