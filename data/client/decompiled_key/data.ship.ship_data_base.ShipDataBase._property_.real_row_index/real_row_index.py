# Source Generated with Decompyle++
# File: real_row_index.pyc (Python 3.11)

if self._real_row_index != value:
    self._real_row_index = value
GameEventManager().notify('[ship_data]ship_row_index_changed', self.ship_uid, value)
