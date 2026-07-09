# Source Generated with Decompyle++
# File: get.pyc (Python 3.11)

if ship_uid in self._ship_data_dict:
    return self._ship_data_dict[ship_uid]
ship_record = None().get_record(self.get_ship_table_name(), ship_uid)
if ship_record:
    ship_data = self._init_ship_data(ship_record = ship_record)
    return ship_data
client_ship_record = None().get_record(ClientBattleTableID.CLIENT_BATTLE_SHIP, ship_uid)
if client_ship_record:
    ship_data = self._init_ship_data(client_ship_record = client_ship_record)
    return ship_data
