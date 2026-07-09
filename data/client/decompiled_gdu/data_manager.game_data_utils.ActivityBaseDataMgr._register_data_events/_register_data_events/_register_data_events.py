# Source Generated with Decompyle++
# File: _register_data_events.pyc (Python 3.11)

self.register_data_event(TableID.ACTIVITY_SYS, protocol.INSERT_DATA_NOTIFY, self._handle_activity_sys_insert)
self.register_data_event(TableID.ACTIVITY_SYS, protocol.UPDATE_DATA_NOTIFY, self._handle_activity_sys_update)
self.register_data_event(TableID.ACTIVITY_SYS, protocol.DEL_DATA_NOTIFY, self._handle_activity_sys_delete)
