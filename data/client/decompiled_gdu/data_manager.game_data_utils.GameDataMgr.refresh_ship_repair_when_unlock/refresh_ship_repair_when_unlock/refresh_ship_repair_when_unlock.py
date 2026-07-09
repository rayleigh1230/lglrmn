# Source Generated with Decompyle++
# File: refresh_ship_repair_when_unlock.pyc (Python 3.11)

ship_utils = ship_utils
import common
notify_data = []
table_ship = GameDataMgr().get_table(TableID.SHIP)
for ship_id_u, ship_record in six.iteritems(table_ship):
    if ship_id_u in self._game_table_dict[SHIP_ESTIMATE]:
        continue
    cur_hp = ship_record[ShipField.HP]
    max_hp = ship_record[ShipField.HP_MAX]
    (bind_drone_hp, bind_drone_max_hp) = ship_utils.get_bind_drone_hp_info(ship_record)
    cur_hp += bind_drone_hp
    max_hp += bind_drone_max_hp
    if cur_hp < max_hp:
        notify_data.append(self.insert_ship_repair(ship_record))
    if notify_data:
        self.data_event_mgr.notify_data_events(notify_data)
        return None
    return None
