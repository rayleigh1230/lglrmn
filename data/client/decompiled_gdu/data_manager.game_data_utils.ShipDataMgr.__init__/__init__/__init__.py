# Source Generated with Decompyle++
# File: __init__.pyc (Python 3.11)

self.reg_name = utils.get_reg_name(self)
self._ship_data_dict = { }
self._next_multithread_insert_flag = False
self._multithread_insert_finish_cb = None
self._insert_thread = None
self._ship_health_change_notify_dict = { }
self._display_ships_cache = None
self.strategy = BaseStratege()
self._register_events()
ShipDataMgr.need_destroy_cache(self.destroy_cache)
