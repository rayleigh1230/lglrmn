# Source Generated with Decompyle++
# File: _remove_activity_id.pyc (Python 3.11)

if activity_id in self._all_activity_id:
    self._all_activity_id.remove(activity_id)
for play_type, activity_ids in self._play_type_activity_ids.items():
    if activity_id in activity_ids:
        activity_ids.remove(activity_id)
    
    self._cache.pop(activity_id, None)
    return None
