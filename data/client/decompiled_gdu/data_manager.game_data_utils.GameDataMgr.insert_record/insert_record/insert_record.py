# Source Generated with Decompyle++
# File: insert_record.pyc (Python 3.11)

table_data = self._game_table_dict.get(table_name)
if table_data:
    if key in table_data:
        return self.update_record(table_name, key, record, notify)
    if None:
        for field in check_fields:
            if field not in record:
                self._logger.error('Missing field {} when insert record {}. Fields needed: {}'.format(field, record, check_fields))
                return None
            if table_name in TableSubKey:
                for table_sub_key in TableSubKey[table_name]:
                    if table_sub_key not in record:
                        self._logger.error('missing sub key "{}" when insert record to table "{}"'.format(table_sub_key, table_name))
                        return None
                    for table_sub_key in TableSubKey[table_name]:
                        self.insert_sub_key_table(table_name, table_sub_key, record[table_sub_key], key)
                        if table_name == TableID.TEAM:
                            record = WrapTeamRecord(record)
                        elif table_name == TableID.WORLD_ITEM:
                            record = WrapWorldItemRecord(record)
                        elif table_name == TableID.TEAM_PLAY:
                            record = WrapTeamPlayRecord(record)
                        elif table_name == ClientSquadTableID.TEAM_SQUAD:
                            record = WrapTeamRecord(record)
                        elif table_name == TableID.SHIP_PLAY:
                            record = WrapShipPlayRecord(record)
                        elif table_name == ClientSquadTableID.SHIP_SQUAD:
                            record = WrapShipSquadRecord(record)
                        elif table_name == ClientSquadTableID.SHIP_FORMATION:
                            record = WrapShipFomationRecord(record)
                        elif table_name == ClientSquadTableID.SHIP_BLUEPRINT_SQUAD:
                            record = WrapShipBlueprintSquadRecord(record)
                        elif table_name == TableID.SHIP:
                            record = WrapShipRecord(record)
                        elif table_name == ClientBattleTableID.CLIENT_BATTLE_SHIP:
                            record = WrapClientShipRecord(record)
                        elif table_name == TableID.SHIP_BLUEPRINT:
                            record = WrapBlueprintRecord(record)
                        elif table_name == TableID.SHIP_BLUEPRINT_GAME_PLAY:
                            record = WrapBlueprintGamePlayRecord(record)
                        elif table_name == TableID.SHIP_BP_OVERVIEW:
                            record = WrapBpOverviewRecord(record)
                        elif table_name == TableID.SHIP_BP_OVERVIEW_GAME_PLAY:
                            record = WrapBpOverviewGamePlayRecord(record)
    table_data[key] = record
    if notify:
        notify_event = ((table_name, protocol.INSERT_DATA_NOTIFY), record)
        self.data_event_mgr.notify_data_events((notify_event,))
return ((table_name, protocol.INSERT_DATA_NOTIFY), record)
self._logger.warning('No such table:{}'.format(table_name))
