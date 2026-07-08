# Source Generated with Decompyle++
# File: is_enough_cost_produce_ship.pyc (Python 3.11)

if not strategy:
    pass
strategy = BaseStratege()
ship_id = self.ship_id
ship_config = Tb_cfg_ship.get(ship_id)
ship_type = ship_config[Tb_cfg_ship.SHIP_TYPE]
if ship_type in SHIP_TYPE_AIRCRAFT:
    if not current_aircraft_num:
        building_id = game_data_utils.get_player_base_building_id()
        (aircraft_num, aircraft_max_num) = game_data_utils.get_aircraft_num_of_building(building_id, True, strategy = strategy)
        current_aircraft_num = (aircraft_num, aircraft_max_num)
    return current_aircraft_num[0] + produce_num <= current_aircraft_num[1]
if not None:
    building_id = game_data_utils.get_player_base_building_id()
    (battle_total_cost, battle_max_cost, _, engineer_total_cost, engineer_max_cost, _) = game_data_utils.get_all_ship_cost_of_building(building_id)
    current_max_cost = [
        battle_total_cost,
        battle_max_cost,
        engineer_total_cost,
        engineer_max_cost]
is_engineer = ship_type in ShipInfo.engineer_ship_type
ship_utils = ship_utils
import common
ship_cost = ship_utils.get_ship_cost_from_ship_bp_record(self.blueprint_record)
current_cost = current_max_cost[2] if is_engineer else current_max_cost[0]
max_cost = current_max_cost[3] if is_engineer else current_max_cost[1]
return ship_cost * produce_num + current_cost <= max_cost
