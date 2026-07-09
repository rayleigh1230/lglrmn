# Source Generated with Decompyle++
# File: get_aircraft_num_of_building.pyc (Python 3.11)

if not strategy:
    pass
strategy = BaseStratege()
if building_id_u == get_player_base_building_id():
    cost_capacity_utils = cost_capacity_utils
    import data_manager.capacity_cost
    (aircraft_num, aircraft_max_num) = cost_capacity_utils.get_aircraft_num_of_building(building_id_u)
    return (aircraft_num, aircraft_max_num)
ship_utils = ship_utils
import common
city_record = GameDataMgr().get_record(TableID.USER_CITY, building_id_u)
aircraft_max_num = 0
if city_record and UserCityField.COST_MAX in city_record and city_record[UserCityField.COST_MAX]:
    aircraft_max_num = parse_cfg_str_to_list(city_record[UserCityField.COST_MAX], True)[2]
boat_count = 0
aircraft_count = 0
ship_table = GameDataMgr().get_table(TableID.SHIP)
for ship_id_u, ship_record in six.iteritems(ship_table):
    if ship_utils.is_ship_belong_to_building(building_id_u, ship_record, strategy = strategy) or ship_record[ShipField.USERID] == GameDataMgr().user_id:
        ship_id = ship_record[ShipField.SHIP_ID]
        ship_cfg = Tb_cfg_ship.get(ship_id)
        sub_fleet_utils = sub_fleet_utils
        import data_manager
        if sub_fleet_utils.is_ship_in_arrive_sub_fleet(ship_id_u):
            continue
        if not ship_cfg:
            continue
        ship_type = ship_cfg[Tb_cfg_ship.SHIP_TYPE]
        if ship_type == CfgShipTypeField.ShipType.SHIP_TYPE_DRONE:
            continue
        ship_level = SHIP_TYPE_LEVEL.get(ship_type)
        if ship_level or ship_level != CfgShipTypeField.ShipLevel.SHIP_LEVEL_AIRCRAFT:
            continue
        ship_id = ship_record[ShipField.SHIP_ID]
        ship_cfg = Tb_cfg_ship.get(ship_id)
    aircraft_type = ship_cfg[Tb_cfg_ship.AIRCRAFT_TYPE]
    if aircraft_type == 0:
        boat_count += 1
        continue
aircraft_count += 1
continue
return (boat_count + aircraft_count, aircraft_max_num)
