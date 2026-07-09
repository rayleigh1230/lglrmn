# Source Generated with Decompyle++
# File: set_next_insert_multithread.pyc (Python 3.11)

if self._multithread_insert_finish_cb:
    return False
self._next_multithread_insert_flag = None
self._multithread_insert_finish_cb = cb
return True
