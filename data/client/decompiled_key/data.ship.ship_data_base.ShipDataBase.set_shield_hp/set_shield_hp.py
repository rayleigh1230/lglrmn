# Source Generated with Decompyle++
# File: set_shield_hp.pyc (Python 3.11)

if self._shield_hp == value:
    return None
self._shield_hp = None
GameEventManager().notify('[ship_data]shield_hp_changed', self.ship_id_u, value)
