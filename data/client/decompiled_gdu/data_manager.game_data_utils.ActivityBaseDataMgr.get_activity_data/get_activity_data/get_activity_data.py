# Source Generated with Decompyle++
# File: get_activity_data.pyc (Python 3.11)

if not activity_id:
    return None
data = None._cache.get(activity_id)
if data:
    data = ActivityData(activity_id, join_db_id)
    if not data.is_valid_data:
        return None
    if None and activity_id in self._all_activity_id:
        self._cache[activity_id] = data
return data
