# Source Generated with Decompyle++
# File: _init_ship_data.pyc (Python 3.11)

if ship_record:
    ship_data = ShipData(ship_record, ship_data_mgr = self)
elif client_ship_record:
    ship_data = ClientBattleShipData(client_ship_record, ship_data_mgr = self)
# WARNING: Decompyle incomplete
