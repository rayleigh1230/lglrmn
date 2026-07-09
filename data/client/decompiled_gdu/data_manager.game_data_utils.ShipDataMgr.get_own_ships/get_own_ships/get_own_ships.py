# Source Generated with Decompyle++
# File: get_own_ships.pyc (Python 3.11)

user_id = GameDataMgr().user_id
ship_data_list = []
for ship_uid, ship_record in self.iter_display_ships():
    if ship_record.get(ShipField.USERID) == user_id:
        ship_data_list.append(self.get(ship_uid))
    return ship_data_list
