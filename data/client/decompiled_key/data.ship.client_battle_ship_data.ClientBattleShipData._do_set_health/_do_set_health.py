# Source Generated with Decompyle++
# File: _do_set_health.pyc (Python 3.11)

if self.health == value:
    return (value, value)
old_health = None.health
new_health = utils.clamp(value, 0, self.health_max)
self.ship_record[ClientBattleShipField.HP] = new_health
return (new_health, old_health)
