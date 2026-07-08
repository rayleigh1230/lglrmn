# Source Generated with Decompyle++
# File: set_shield_hp_max.pyc (Python 3.11)

if self._shield_hp_max == value:
    return None
self._shield_hp_max = None
GameEventManager().notify('[ship_data]shield_hp_max_changed', self.ship_id_u, value)
