# Source Generated with Decompyle++
# File: _handle_team_attr_update.pyc (Python 3.11)

notify_data = []
if TeamAttrField.REPAIR_QUEUE in update_team_attr_record or TeamAttrField.REPAIR_QUEUE_LIMT in update_team_attr_record:
    game_data_utils = game_data_utils
    import data_manager
    team_attr = GameDataMgr().get_record(TableID.TEAM_ATTR, update_team_attr_record[TeamAttrField.TEAM_ID])
    repair_queue = game_data_utils.parse_cfg_str_to_list(team_attr[TeamAttrField.REPAIR_QUEUE], is_num = True)
    team_utils = team_utils
    ship_utils = ship_utils
    import common
    team_record = GameDataMgr().get_record(TableID.TEAM, update_team_attr_record[TeamAttrField.TEAM_ID])
    is_support_dock = team_utils.is_team_support_dock_self_building(team_record)
    for i, ship_id_u in enumerate(repair_queue):
        if i >= team_attr[TeamAttrField.REPAIR_QUEUE_LIMT]:
            if not is_support_dock:
                pass
            elif GameDataMgr().get_record(SHIP_ESTIMATE, ship_id_u):
                notify_data.append(self.delete_record(SHIP_ESTIMATE, ship_id_u))
            continue
        if not GameDataMgr().get_record(SHIP_ESTIMATE, ship_id_u):
            ship_record = GameDataMgr().get_record(TableID.SHIP, ship_id_u)
            if not ship_record:
                continue
            refresh_time = team_attr[TeamAttrField.REPAIR_AND_PRODUCE_BEGIN_TIME]
            cur_hp = ship_record[ShipField.HP]
            max_hp = ship_record[ShipField.HP_MAX]
            (bind_drone_hp, bind_drone_max_hp) = ship_utils.get_bind_drone_hp_info(ship_record)
            cur_hp += bind_drone_hp
            max_hp += bind_drone_max_hp
        notify_data.append(self.insert_record(SHIP_ESTIMATE, ship_id_u, {
            SHIP_SERVER_HP: cur_hp,
            SHIP_REPAIR_SERVER_REFRESH_TIME: refresh_time,
            SHIP_REPAIR_REFRESH_TIME: refresh_time,
            ShipField.SHIP_ID: ship_record[ShipField.SHIP_ID],
            ShipField.HP_MAX: max_hp,
            SHIP_HP_CUR: cur_hp,
            ShipField.SHIP_ID_U: ship_id_u }))
        if TeamAttrField.REPAIR_QUEUE in old_record:
            old_repair_queue = game_data_utils.parse_cfg_str_to_list(old_record[TeamAttrField.REPAIR_QUEUE], is_num = True)
            for ship_id_u in old_repair_queue:
                if not ship_id_u not in repair_queue:
                    is_need_remove_record = repair_queue.index(ship_id_u) >= team_attr[TeamAttrField.REPAIR_QUEUE_LIMT]
                    if GameDataMgr().get_record(SHIP_ESTIMATE, ship_id_u) and is_need_remove_record:
                        notify_data.append(self.delete_record(SHIP_ESTIMATE, ship_id_u))
                        ship_record = GameDataMgr().get_record(TableID.SHIP, ship_id_u)
                        if ship_record:
                            notify_data.append(self._handle_ship_insert(ship_record))
                        continue
                if not is_support_dock and is_need_remove_record and GameDataMgr().get_record(SHIP_ESTIMATE, ship_id_u):
                    ship_record = GameDataMgr().get_record(TableID.SHIP, ship_id_u)
                    if ship_record:
                        notify_data.append(self._handle_ship_insert(ship_record))
                if notify_data:
                    self.data_event_mgr.notify_data_events(notify_data, True)
                    return None
                return None
