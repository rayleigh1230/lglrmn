# Source Generated with Decompyle++
# File: destroy_singleton_instance.pyc (Python 3.11)

self._event_handlers.clear()
self.unregister_look_up_dict.clear()
self._registrants.clear()
del self._cached_actions[:]
self._notifying_events.clear()
del self.late_event[:]
GameEventManager.remove_instance()
