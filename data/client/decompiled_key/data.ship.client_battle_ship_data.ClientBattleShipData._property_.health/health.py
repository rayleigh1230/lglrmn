# Source Generated with Decompyle++
# File: health.pyc (Python 3.11)

(new_health, old_health) = self._do_set_health(value)
if new_health != old_health:
    GameEventManager().notify('[ship]health_changed', [
        (self.ship_uid, new_health, old_health)])
    return None
