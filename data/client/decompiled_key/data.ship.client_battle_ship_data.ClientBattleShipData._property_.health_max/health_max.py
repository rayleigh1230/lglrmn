# Source Generated with Decompyle++
# File: health_max.pyc (Python 3.11)

if self.health_max == value:
    return None
old_health_max = None.health_max
self.ship_record[ClientBattleShipField.HP_MAX] = value
GameEventManager().notify('[ship]health_max_changed', self.ship_uid, value, old_health_max)
