# Source Generated with Decompyle++
# File: _destroy_dock_item_subscriber_timer.pyc (Python 3.11)

if self._dock_item_subscriber_timer:
    time_utils = time_utils
    import common
    time_utils.unregister_neox_timer(self._dock_item_subscriber_timer)
    self._dock_item_subscriber_timer = None
    return None
