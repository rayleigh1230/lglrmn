# Source Generated with Decompyle++
# File: _remove_registrant_event.pyc (Python 3.11)

registrant_set = self._registrants[registrant]
registrant_set.remove(event_type)
if not registrant_set:
    del self._registrants[registrant]
    return None
