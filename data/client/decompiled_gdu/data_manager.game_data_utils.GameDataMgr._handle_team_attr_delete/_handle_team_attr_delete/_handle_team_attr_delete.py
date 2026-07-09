# Source Generated with Decompyle++
# File: _handle_team_attr_delete.pyc (Python 3.11)

if TeamAttrField.REPAIR_QUEUE in _deleted_record:
    game_data_utils = game_data_utils
    import data_manager
    old_repair_queue = game_data_utils.parse_cfg_str_to_list(_deleted_record[TeamAttrField.REPAIR_QUEUE], is_num = True)
    notify_data = []
    for ship_id_u in old_repair_queue:
        if GameDataMgr().get_record(SHIP_ESTIMATE, ship_id_u):
            notify_data.append(self.delete_record(SHIP_ESTIMATE, ship_id_u))
            ship_record = GameDataMgr().get_record(TableID.SHIP, ship_id_u)
            if ship_record:
                notify_data.append(self._handle_ship_insert(ship_record))
        self.data_event_mgr.notify_data_events(notify_data, True)
        return None
        return None
