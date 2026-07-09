# Source Generated with Decompyle++
# File: update_record.pyc (Python 3.11)

table_data = self._game_table_dict.get(table_name)
if table_data:
    if key in table_data:
        old_data = table_data[key]
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
        if record == old_data:
            return None
        table_key = TableKey[table_name] if None in TableKey else CLIENT_TABLE_NAME[table_name]
        update_data = {
            table_key: key }
        replaced_data = {
            table_key: key }
        for k, v in record.items():
            old_v = old_data.get(k)
            if v != old_v:
                update_data[k] = v
                replaced_data[k] = old_v
            if len(update_data) <= 1:
                return None
            if None in TableSubKey:
                table_sub_keys = TableSubKey[table_name]
                for k, v in update_data.items():
                    if k in table_sub_keys:
                        self.update_sub_key_table(table_name, k, v, old_data.get(k), key)
                    if table_name == TableID.TEAM:
                        update_data = WrapTeamRecord(update_data)
                        replaced_data = WrapTeamRecord(replaced_data)
                    elif table_name == TableID.WORLD_ITEM:
                        update_data = WrapWorldItemRecord(update_data)
                        replaced_data = WrapWorldItemRecord(replaced_data)
                    elif table_name == TableID.TEAM_PLAY:
                        update_data = WrapTeamPlayRecord(update_data)
                        replaced_data = WrapTeamPlayRecord(replaced_data)
                    elif table_name == ClientSquadTableID.TEAM_SQUAD:
                        update_data = WrapTeamRecord(update_data)
                        replaced_data = WrapTeamRecord(replaced_data)
                    elif table_name == TableID.SHIP_PLAY:
                        update_data = WrapShipPlayRecord(update_data)
                        replaced_data = WrapShipPlayRecord(replaced_data)
                    elif table_name == ClientSquadTableID.SHIP_SQUAD:
                        update_data = WrapShipSquadRecord(update_data)
                        replaced_data = WrapShipSquadRecord(replaced_data)
                    elif table_name == ClientSquadTableID.SHIP_FORMATION:
                        update_data = WrapShipFomationRecord(update_data)
                        replaced_data = WrapShipFomationRecord(replaced_data)
                    elif table_name == ClientSquadTableID.SHIP_BLUEPRINT_SQUAD:
                        update_data = WrapShipBlueprintSquadRecord(update_data)
                        replaced_data = WrapShipBlueprintSquadRecord(replaced_data)
                    elif table_name == TableID.SHIP:
                        update_data = WrapShipRecord(update_data)
                        replaced_data = WrapShipRecord(replaced_data)
                    elif table_name == ClientBattleTableID.CLIENT_BATTLE_SHIP:
                        update_data = WrapClientShipRecord(update_data)
                        replaced_data = WrapClientShipRecord(replaced_data)
                    elif table_name == TableID.SHIP_BLUEPRINT:
                        update_data = WrapBlueprintRecord(update_data)
                        replaced_data = WrapBlueprintRecord(replaced_data)
                    elif table_name == TableID.SHIP_BLUEPRINT_GAME_PLAY:
                        update_data = WrapBlueprintGamePlayRecord(update_data)
                        replaced_data = WrapBlueprintGamePlayRecord(replaced_data)
                    elif table_name == TableID.SHIP_BP_OVERVIEW:
                        update_data = WrapBpOverviewRecord(update_data)
                        replaced_data = WrapBpOverviewRecord(replaced_data)
                    elif table_name == TableID.SHIP_BP_OVERVIEW_GAME_PLAY:
                        update_data = WrapBpOverviewGamePlayRecord(update_data)
                        replaced_data = WrapBpOverviewGamePlayRecord(replaced_data)
        old_data.update(record)
        if notify:
            notify_event = ((table_name, protocol.UPDATE_DATA_NOTIFY), update_data, replaced_data)
            self.data_event_mgr.notify_data_events((notify_event,))
        return ((table_name, protocol.UPDATE_DATA_NOTIFY), update_data, replaced_data)
        self._logger.warning('No record:{} in table:{}'.format(key, table_name))
        return None
    self._logger.warning('No such table:{}'.format(table_name))
    return None
