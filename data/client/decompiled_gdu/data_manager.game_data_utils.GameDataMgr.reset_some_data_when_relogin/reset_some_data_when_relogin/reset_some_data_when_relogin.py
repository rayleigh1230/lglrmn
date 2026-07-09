# Source Generated with Decompyle++
# File: reset_some_data_when_relogin.pyc (Python 3.11)

io_entry_table = self.get_table(TableID.IO_ENTRY_POINT)
for key in list(io_entry_table.keys()):
    self.delete_record(TableID.IO_ENTRY_POINT, key)
    return None
