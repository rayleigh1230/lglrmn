# Source Generated with Decompyle++
# File: _rebuild_display_ships_cache.pyc (Python 3.11)

is_ship_excluded_from_normal_use = is_ship_excluded_from_normal_use
import common.ship_utils
ship_table = GameDataMgr().get_table(self.get_ship_table_name())
cache = { }
for ship_uid, ship_record in six.iteritems(ship_table):
    if is_ship_excluded_from_normal_use(ship_uid):
        continue
    cache[ship_uid] = ship_record
    self._display_ships_cache = cache
    return None
