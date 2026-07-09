# Source Generated with Decompyle++
# File: _do_handle_ship_grouped_insert.pyc (Python 3.11)

if self._display_ships_cache:
    is_ship_excluded_from_normal_use = is_ship_excluded_from_normal_use
    import common.ship_utils
    ship_table = GameDataMgr().get_table(self.get_ship_table_name())
    for _, new_record in grouped_data:
        ship_uid = new_record[ShipField.SHIP_ID_U]
        if ship_uid not in ship_table:
            continue
        if is_ship_excluded_from_normal_use(ship_uid):
            continue
        self._display_ships_cache[ship_uid] = ship_table[ship_uid]
        team_id_set = set()
        need_update_belong_ship_uids = set()
        for _, new_record in grouped_data:
            team_id = new_record[ShipField.TEAM_ID]
            ship_uid = new_record[ShipField.SHIP_ID_U]
            self._insert_ship(ship_uid, team_id)
            team_id_set.add(new_record[ShipField.TEAM_ID])
            if ClientBattleShipField.BELONG_SHIP_SLOT_IDX in new_record:
                need_update_belong_ship_uids.add(new_record[ShipField.BELONG_SHIP_ID_U])
            self._next_multithread_insert_flag = False
            if self._multithread_insert_finish_cb:
                cb = self._multithread_insert_finish_cb
                self._multithread_insert_finish_cb = None
                cb()
for team_id in team_id_set:
    GameEventManager().notify('[team]health_changed', team_id)
    self._update_ships_aircraft(need_update_belong_ship_uids)
    return None
