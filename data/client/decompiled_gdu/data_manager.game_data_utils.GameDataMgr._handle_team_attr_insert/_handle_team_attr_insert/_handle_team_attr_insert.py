# Source Generated with Decompyle++
# File: _handle_team_attr_insert.pyc (Python 3.11)

notify_data = []
if team_attr_record[TeamAttrField.USERID] == self.user_id:
    game_data_utils = game_data_utils
    import data_manager
    ship_utils = ship_utils
    import common
    repair_queue = game_data_utils.parse_cfg_str_to_list(team_attr_record[TeamAttrField.REPAIR_QUEUE], is_num = True)
    for i, ship_id_u in enumerate(repair_queue):
        if i >= team_attr_record[TeamAttrField.REPAIR_QUEUE_LIMT]:
            pass
        elif not GameDataMgr().get_record(SHIP_ESTIMATE, ship_id_u):
            ship_record = GameDataMgr().get_record(TableID.SHIP, ship_id_u)
            if not ship_record:
                continue
            refresh_time = team_attr_record[TeamAttrField.REPAIR_AND_PRODUCE_BEGIN_TIME]
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
        if notify_data:
            self.data_event_mgr.notify_data_events(notify_data, True)
            return None
        return None
