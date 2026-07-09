# Source Generated with Decompyle++
# File: _handle_group_ship_update.pyc (Python 3.11)

notify_data = []
time_utils = time_utils
ship_utils = ship_utils
import common
for _, update_ship_record, old_record in group_update_data:
    ship_id_u = update_ship_record[ShipField.SHIP_ID_U]
    full_record = self.get_record(TableID.SHIP, ship_id_u)
    if not full_record[ShipField.USERID] != self.user_id and self.is_ship_in_shipyard(ship_id_u):
        continue
    cur_hp = full_record[ShipField.HP]
    max_hp = full_record[ShipField.HP_MAX]
    (bind_drone_hp, bind_drone_max_hp) = ship_utils.get_bind_drone_hp_info(full_record)
    cur_hp += bind_drone_hp
    max_hp += bind_drone_max_hp
    if ship_id_u in self._game_table_dict[SHIP_ESTIMATE]:
        if ShipField.HP_MAX in update_ship_record or ShipField.BELONG_ID in update_ship_record:
            current_hp = self._game_table_dict[SHIP_ESTIMATE][ship_id_u][SHIP_HP_CUR]
            notify_data.append(self.delete_record(SHIP_ESTIMATE, ship_id_u))
            if cur_hp < max_hp:
                notify_data.append(self._handle_ship_insert(full_record))
                if ship_id_u in self._game_table_dict[SHIP_ESTIMATE]:
                    server_time = time_utils.get_server_time()
                    self._game_table_dict[SHIP_ESTIMATE][ship_id_u][SHIP_HP_CUR] = current_hp
                    self._game_table_dict[SHIP_ESTIMATE][ship_id_u][SHIP_REPAIR_REFRESH_TIME] = server_time
                    self._game_table_dict[SHIP_ESTIMATE][ship_id_u][SHIP_REPAIR_SERVER_REFRESH_TIME] = server_time
                    self._game_table_dict[SHIP_ESTIMATE][ship_id_u][SHIP_SERVER_HP] = current_hp
                elif ShipField.HP in update_ship_record:
                    if cur_hp == max_hp:
                        notify_data.append(self.delete_record(SHIP_ESTIMATE, ship_id_u))
                    elif full_record.get(ShipField.STATE) == ShipField.State.STATE_NORMAL:
                        need_update = False
                        if ship_utils.is_ship_berth_in_any_dock(full_record):
                            need_update = True
                        elif full_record.get(ShipField.TEAM_ID):
                            team_record = GameDataMgr().get_record(TableID.TEAM, full_record[TeamField.TEAM_ID])
                            if team_record and team_record[TeamField.ACTION] == TeamField.Action.ACTION_PARK:
                                need_update = True
                        if need_update:
                            notify_data.append(self.update_record(SHIP_ESTIMATE, ship_id_u, {
                                SHIP_HP_CUR: update_ship_record[ShipField.HP] + bind_drone_hp }))
        if ShipField.STATE in update_ship_record:
            if update_ship_record[ShipField.STATE] != ShipField.State.STATE_NORMAL:
                notify_data.append(self.delete_record(SHIP_ESTIMATE, ship_id_u))
            elif cur_hp < max_hp:
                notify_data.append(self.insert_ship_repair(full_record))
        if ShipField.USERID in update_ship_record and update_ship_record[ShipField.USERID] > 0 and self.is_ship_in_shipyard(ship_id_u):
            notify_data.append(self.delete_record(SHIP_ESTIMATE, ship_id_u))
        else:
            need_update = False
            if ShipField.HP in update_ship_record and ShipField.TEAM_ID in update_ship_record and ShipField.STATE in update_ship_record or ship_utils.is_ship_berth_in_any_dock(update_ship_record):
                need_update = True
                team_id = full_record[ShipField.TEAM_ID]
                if team_id:
                    team_record = GameDataMgr().get_record(TableID.TEAM, team_id)
                    if team_record:
                        if team_record[TeamField.TEAM_TYPE] == TeamField.Type.TYPE_BASE:
                            need_update = False
                        if team_record[TeamField.TEAM_TYPE] == TeamField.Type.TYPE_AIRCRAFT_GUARD_TEAM:
                            need_update = True
                        elif team_record[TeamField.ACTION] != TeamField.Action.ACTION_PARK:
                            need_update = False
                        else:
                            need_update = full_record.get(ShipField.STATE) == ShipField.State.STATE_NORMAL
            if need_update and ShipField.HP_MAX in update_ship_record and update_ship_record[ShipField.HP_MAX] > old_record[ShipField.HP_MAX]:
                need_update = True
    if need_update:
        notify_data.append(self._handle_ship_insert(full_record))
    if cur_hp > max_hp:
        notify_data.append(self.update_record(TableID.SHIP, ship_id_u, {
            ShipField.HP: full_record[ShipField.HP_MAX] }))
    if ShipField.REFORMING_END_TIME in update_ship_record:
        server_time = time_utils.get_server_time()
        if update_ship_record[ShipField.REFORMING_END_TIME] > server_time:
            if ship_id_u in self._game_table_dict[SHIP_REFORM]:
                notify_data.append(self.update_record(SHIP_REFORM, ship_id_u, {
                    ShipField.REFORMING_END_TIME: update_ship_record[ShipField.REFORMING_END_TIME] }))
                continue
            full_record = self.get_record(TableID.SHIP, ship_id_u)
            team_id = full_record[ShipField.TEAM_ID]
            if team_id:
                team_record = GameDataMgr().get_record(TableID.TEAM, team_id)
                if team_record and team_record[TeamField.TEAM_TYPE] == TeamField.Type.TYPE_BASE:
                    continue
self.insert_record(SHIP_REFORM, ship_id_u, {
    ShipField.REFORMING_END_TIME: update_ship_record[ShipField.REFORMING_END_TIME],
    ShipField.SHIP_ID_U: ship_id_u })
continue
self.data_event_mgr.notify_data_events(notify_data, True)
