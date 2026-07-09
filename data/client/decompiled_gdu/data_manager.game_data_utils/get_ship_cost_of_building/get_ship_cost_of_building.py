# Source Generated with Decompyle++
# File: get_ship_cost_of_building.pyc (Python 3.11)

cost_capacity_utils = cost_capacity_utils
import data_manager.capacity_cost
BaseStratege = BaseStratege
import data_manager.table_strategies
if not strategy:
    strategy = BaseStratege()
    (military_port_cur_cost, military_port_max_cost, engineer_port_cur_cost, engineer_port_max_cost) = cost_capacity_utils.get_ship_cost_of_building(building_id_u)
    ship_utils = ship_utils
    import common
    if is_engineer_cost:
        total_cost = engineer_port_cur_cost
        max_cost = engineer_port_max_cost
        target_level_set = ship_utils.ENGINEER_SHIP_LEVEL_COST
    else:
        total_cost = military_port_cur_cost
        max_cost = military_port_max_cost
        target_level_set = ship_utils.BATTLE_SHIP_LEVEL_COST
num = 0
base_produce_cost = 0
outside_produce_cost = 0
producing_states = (ShipField.State.STATE_PRODUCING, ShipField.State.STATE_QUEUE)
ship_in_this_building = ship_utils.get_building_ships(building_id_u, strategy = strategy)
for ship_id_u, ship_record in six.iteritems(ship_in_this_building):
    ship_id = ship_record[ShipField.SHIP_ID]
    ship_cfg_record = Tb_cfg_ship.get(ship_id)
    if not ship_cfg_record:
        continue
    ship_type = ship_cfg_record[Tb_cfg_ship.SHIP_TYPE]
    if ship_type == CfgShipTypeField.ShipType.SHIP_TYPE_DRONE:
        continue
    ship_level = SHIP_TYPE_LEVEL.get(ship_type)
    if ship_level not in target_level_set:
        continue
    num += 1
    ship_cost = ship_utils.get_ship_cost_from_ship_record(ship_record)
    if ship_record[ShipField.STATE] in producing_states:
        base_produce_cost += ship_cost
    if ship_utils.is_ship_from_endurance(ship_record):
        outside_produce_cost += ship_cost
    if include_outside_produce_ship:
        total_cost += outside_produce_cost
if not include_base_produce:
    total_cost -= base_produce_cost
return (total_cost, max_cost, num)
