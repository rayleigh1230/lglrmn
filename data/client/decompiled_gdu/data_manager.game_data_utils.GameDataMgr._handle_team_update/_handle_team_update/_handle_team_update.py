# Source Generated with Decompyle++
# File: _handle_team_update.pyc (Python 3.11)

notify_data = []
if TeamField.ACTION in update_team_record:
    if update_team_record[TeamField.ACTION] == TeamField.Action.ACTION_PARK:
        team_record = self.get_record(TableID.TEAM, update_team_record[TeamField.TEAM_ID])
        if team_record[TeamField.USERID] == self.user_id:
            team_utils = team_utils
            import common
            ship_uid_list = team_utils.get_ship_uid_list_of_team(update_team_record[TeamField.TEAM_ID])
            for ship_id_u in ship_uid_list:
                ship_record = self.get_record(TableID.SHIP, ship_id_u)
                if ship_record:
                    notify_data.append(self._handle_ship_insert(ship_record))
            if old_record[TeamField.ACTION] == TeamField.Action.ACTION_PARK:
                team_record = self.get_record(TableID.TEAM, update_team_record[TeamField.TEAM_ID])
                if team_record[TeamField.USERID] == self.user_id:
                    team_utils = team_utils
                    import common
                    ship_uid_list = team_utils.get_ship_uid_list_of_team(update_team_record[TeamField.TEAM_ID])
                    ship_estimate_table = self.get_table(SHIP_ESTIMATE)
                    for ship_id_u in ship_uid_list:
                        if ship_id_u in ship_estimate_table:
                            ship_record = self.get_record(TableID.SHIP, ship_id_u)
                            if ship_record:
                                notify_data.append(self._handle_ship_delete(ship_id_u, ship_record))
                        if TeamField.STATE in update_team_record:
                            new_state = update_team_record[TeamField.STATE]
                            if new_state != TeamField.State.STATE_SYNC_MOVE:
                                team_id = update_team_record[TeamField.TEAM_ID]
                                full_record = self.get_record(TableID.TEAM, team_id)
                                if full_record:
                                    if TEAM_SYNC_POS in full_record:
                                        del full_record[TEAM_SYNC_POS]
                                    if TEAM_SYNC_POS_COORDINATE in full_record:
                                        del full_record[TEAM_SYNC_POS_COORDINATE]
                                    if TEAM_SYNC_POS_LAST in full_record:
                                        del full_record[TEAM_SYNC_POS_LAST]
                                    if TEAM_SYNC_POS_COORDINATE_LAST in full_record:
                                        del full_record[TEAM_SYNC_POS_COORDINATE_LAST]
if not TEAM_SYNC_RVO_STATE in update_team_record and old_record.get(TEAM_SYNC_RVO_STATE) and update_team_record[TEAM_SYNC_RVO_STATE]:
    team_id = update_team_record[TeamField.TEAM_ID]
    full_record = self.get_record(TableID.TEAM, team_id)
    if full_record:
        del_data_names = (TEAM_SYNC_RVO_START_POS, TEAM_SYNC_RVO_START_COORDINATE, TEAM_SYNC_RVO_END_POS, TEAM_SYNC_RVO_END_COORDINATE, TEAM_SYNC_RVO_SPEED, TEAM_SYNC_RVO_START_TIME)
        for name in del_data_names:
            if name in full_record:
                del full_record[name]
            if TeamField.ATTR2 in update_team_record:
                full_team_record = self.get_record(TableID.TEAM, update_team_record[TeamField.TEAM_ID])
                state = full_team_record[TeamField.STATE]
                if state == TeamField.State.STATE_STATIC or full_team_record[TeamField.USERID] == GameDataMgr().user_id:
                    game_data_utils = game_data_utils
                    import data_manager
                    is_current_dock_open = game_data_utils.get_bit_info(update_team_record[TeamField.ATTR2], TeamField.Attr2.ATTR2_RENDEZVOUS_OPENING)
                    old_is_dock_open = game_data_utils.get_bit_info(old_record.get(TeamField.ATTR2, 0), TeamField.Attr2.ATTR2_RENDEZVOUS_OPENING)
                    if not is_current_dock_open and old_is_dock_open:
                        GameEventManager().notify('toast_text', language.TEAM_ENTER_DOCK_OPEN_STATE.format(full_team_record[TeamField.NAME]))
                    elif is_current_dock_open and old_is_dock_open:
                        GameEventManager().notify('toast_text', language.TEAM_ENTER_DOCK_EXIT_STATE.format(full_team_record[TeamField.NAME]))
                    is_current_docked = game_data_utils.get_bit_info(update_team_record[TeamField.ATTR2], TeamField.Attr2.ATTR2_DOCKED)
                    old_is_current_docked = game_data_utils.get_bit_info(old_record.get(TeamField.ATTR2, 0), TeamField.Attr2.ATTR2_DOCKED)
                    if not is_current_docked and old_is_current_docked:
                        GameEventManager().notify('toast_text', language.TEAM_ENTER_DOCKED_JOINT_STATE.format(full_team_record[TeamField.NAME]))
if notify_data:
    self.data_event_mgr.notify_data_events(notify_data, True)
    return None
