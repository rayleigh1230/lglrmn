# Source Generated with Decompyle++
# File: register_rendezvous_subscriber_timer.pyc (Python 3.11)

time_utils = time_utils
import common
self._destroy_rendezvous_subscriber_timer()
self._rendezvous_subscriber_timer = time_utils.register_neox_timer(600000, self._check_and_send_rendezvous_subscribtion)
