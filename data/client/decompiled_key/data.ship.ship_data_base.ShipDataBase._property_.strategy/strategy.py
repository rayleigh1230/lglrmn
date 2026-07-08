# Source Generated with Decompyle++
# File: strategy.pyc (Python 3.11)

if self._table_strategy:
    return self._table_strategy
cross_dungeon_utils = cross_dungeon_utils
import dungeon
if self.ship_record:
    self._table_strategy = cross_dungeon_utils.get_table_strategy(self.ship_record)
else:
    self._table_strategy = BaseStratege()
return self._table_strategy
