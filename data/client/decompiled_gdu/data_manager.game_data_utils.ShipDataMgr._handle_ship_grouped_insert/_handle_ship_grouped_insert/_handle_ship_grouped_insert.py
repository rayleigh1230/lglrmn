# Source Generated with Decompyle++
# File: _handle_ship_grouped_insert.pyc (Python 3.11)

if not self._next_multithread_insert_flag and self._insert_thread:
    self._insert_thread = threading.Thread(target = self._do_handle_ship_grouped_insert, args = (grouped_data,))
    self._insert_thread.start()
    return None
None._do_handle_ship_grouped_insert(grouped_data)
