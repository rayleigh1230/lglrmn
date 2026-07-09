# Source Generated with Decompyle++
# File: _update_ship_data.pyc (Python 3.11)

ship_data = self._ship_data_dict.get(ship_uid, None)
if ship_data:
    ship_record = GameDataMgr().get_record(self.get_ship_table_name(), ship_uid)
    if ship_record:
        ship_data.update_by_record(ship_record)
        return None
    ship_record = None().get_record(ClientBattleTableID.CLIENT_BATTLE_SHIP, ship_uid)
    if ship_record:
        ship_data.update_by_record(ship_record)
        return None
    return None
