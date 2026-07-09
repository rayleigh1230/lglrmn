# Source Generated with Decompyle++
# File: get_all_ship_cost_of_building.pyc (Python 3.11)

cost_capacity_utils = cost_capacity_utils
import data_manager.capacity_cost
BaseStratege = BaseStratege
import data_manager.table_strategies
if not strategy:
    strategy = BaseStratege()
    (military_port_cur_cost, military_port_max_cost, engineer_port_cur_cost, engineer_port_max_cost) = cost_capacity_utils.get_ship_cost_of_building(building_id_u)
    ship_utils = ship_utils
    import common
    battle_num = 0
    battle_base_produce_cost = 0
    battle_outside_produce_cost = 0
    engineer_num = 0
    engineer_base_produce_cost = 0
    engineer_outside_produce_cost = 0
    producing_states = (ShipField.State.STATE_PRODUCING, ShipField.State.STATE_QUEUE)
    battle_set = ship_utils.BATTLE_SHIP_LEVEL_COST
    engineer_set = ship_utils.ENGINEER_SHIP_LEVEL_COST
    ship_in_this_building = ship_utils.get_building_ships(building_id_u, strategy = strategy)
    for ship_id_u, ship_record in six.iteritems(ship_in_this_building):
        ship_cfg_record = Tb_cfg_ship.get(ship_record[ShipField.SHIP_ID])
        if not ship_cfg_record:
            continue
        ship_type = ship_cfg_record[Tb_cfg_ship.SHIP_TYPE]
        if ship_type == CfgShipTypeField.ShipType.SHIP_TYPE_DRONE:
            continue
        ship_level = SHIP_TYPE_LEVEL.get(ship_type)
        if ship_level in battle_set:
            battle_num += 1
            ship_cost = ship_utils.get_ship_cost_from_ship_record(ship_record)
            if ship_record[ShipField.STATE] in producing_states:
                battle_base_produce_cost += ship_cost
            if ship_utils.is_ship_from_endurance(ship_record):
                battle_outside_produce_cost += ship_cost
            continue
        if ship_level in engineer_set:
            engineer_num += 1
            ship_cost = ship_utils.get_ship_cost_from_ship_record(ship_record)
            if ship_record[ShipField.STATE] in producing_states:
                engineer_base_produce_cost += ship_cost
            if ship_utils.is_ship_from_endurance(ship_record):
                engineer_outside_produce_cost += ship_cost
continue
battle_total = military_port_cur_cost
engineer_total = engineer_port_cur_cost
if include_outside_produce_ship:
    battle_total += battle_outside_produce_cost
    engineer_total += engineer_outside_produce_cost
if not include_base_produce:
    battle_total -= battle_base_produce_cost
    engineer_total -= engineer_base_produce_cost
return (battle_total, military_port_max_cost, battle_num, engineer_total, engineer_port_max_cost, engineer_num)
