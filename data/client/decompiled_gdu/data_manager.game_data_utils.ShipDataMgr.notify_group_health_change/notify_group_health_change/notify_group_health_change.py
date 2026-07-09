# Source Generated with Decompyle++
# File: notify_group_health_change.pyc (Python 3.11)

notify_data_list = []
for new_health, old_health in self._ship_health_change_notify_dict.items():
    notify_data_list.append((ship_uid, new_health, old_health))
    self._ship_health_change_notify_dict.clear()
    if notify_data_list:
        GameEventManager().notify('[ship]health_changed', notify_data_list)
        return None
    return None
