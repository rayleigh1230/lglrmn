# Source Generated with Decompyle++
# File: get_store_activity_ids.pyc (Python 3.11)

_list = self._play_type_activity_ids.get(activity_sys_type.TYPE_SCORE_STORE_V2, [])
if activity_id_config.ID_TANK_WORLD_STORE not in _list:
    _list.append(activity_id_config.ID_TANK_WORLD_STORE)
return _list
