# Source Generated with Decompyle++
# File: is_unlock_facility.pyc (Python 3.11)

ship_id = self.ship_id
ship_config = Tb_cfg_ship.get(ship_id)
ship_type = ship_config[Tb_cfg_ship.SHIP_TYPE]
building_id = game_data_utils.get_player_base_building_id()
city_record = GameDataMgr().get_record(TableID.USER_CITY, building_id)
unlock_ship_type = game_data_utils.parse_cfg_str_to_list(city_record[UserCityField.UNLOCK_SHIP_TYPE], True)
return ship_type in unlock_ship_type
