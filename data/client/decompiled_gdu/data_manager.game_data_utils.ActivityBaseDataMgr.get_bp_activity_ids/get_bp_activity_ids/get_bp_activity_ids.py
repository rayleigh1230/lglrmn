# Source Generated with Decompyle++
# File: get_bp_activity_ids.pyc (Python 3.11)

_list = self._play_type_activity_ids.get(activity_sys_type.TYPE_BATTLE_PASS, [])
if activity_id_config.ID_TANK_WORLD_BATTLEPASS not in _list:
    _list.append(activity_id_config.ID_TANK_WORLD_BATTLEPASS)
return _list
