# Source Generated with Decompyle++
# File: destroy.pyc (Python 3.11)

self.channel_data = None
self._destroy_rendezvous_subscriber_timer()
self._destroy_dock_item_subscriber_timer()
self.data_event_mgr.unregister_data_event(registrant = self.reg_name)
if GameEventManager.has_instance():
    GameEventManager().unregister_event(registrant = self.reg_name)
self.destroy_singleton_instance()
