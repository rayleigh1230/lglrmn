# Source Generated with Decompyle++
# File: _handle_ship_grouped_delete.pyc (Python 3.11)

if self._display_ships_cache:
    for _, ship_uid, _del_record in grouped_data:
        self._display_ships_cache.pop(ship_uid, None)
        team_id_set = set()
        need_update_belong_ship_uids = set()
        for _, ship_uid, del_record in grouped_data:
            self._remove_ship(ship_uid, del_record[ShipField.TEAM_ID])
            team_id_set.add(del_record[ShipField.TEAM_ID])
            if ClientBattleShipField.BELONG_SHIP_SLOT_IDX in del_record:
                need_update_belong_ship_uids.add(del_record[ShipField.BELONG_SHIP_ID_U])
            team_data_utils = team_data_utils
            import data_manager
            for team_id in team_id_set:
                GameEventManager().notify('[team]health_changed', team_id)
                team_data_utils.update_team_hp(team_id, strategy = self.strategy)
                self._update_ships_aircraft(need_update_belong_ship_uids)
                return None
