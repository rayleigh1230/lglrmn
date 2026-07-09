# Source Generated with Decompyle++
# File: register_dock_item_subscriber_timer.pyc (Python 3.11)

time_utils = time_utils
import common
self._destroy_dock_item_subscriber_timer()
self._dock_item_subscriber_timer = time_utils.register_neox_timer(590000, self._check_and_send_dock_item_subscribtion)
