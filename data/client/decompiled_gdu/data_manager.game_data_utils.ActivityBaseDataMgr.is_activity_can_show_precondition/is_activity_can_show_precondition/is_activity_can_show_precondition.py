# Source Generated with Decompyle++
# File: is_activity_can_show_precondition.pyc (Python 3.11)

if activity_id in self._precondition_cache:
    return self._precondition_cache[activity_id]
is_show = None._is_activity_can_show_precondition(activity_id)
if self._can_precondition_cache:
    self._precondition_cache[activity_id] = is_show
return is_show
