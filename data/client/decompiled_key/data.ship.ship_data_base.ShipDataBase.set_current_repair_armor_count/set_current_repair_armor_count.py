# Source Generated with Decompyle++
# File: set_current_repair_armor_count.pyc (Python 3.11)

self._current_repair_armor_count = value
GameEventManager().notify('[ship_data]current_repair_armor_count_changed', self.ship_id_u, value)
