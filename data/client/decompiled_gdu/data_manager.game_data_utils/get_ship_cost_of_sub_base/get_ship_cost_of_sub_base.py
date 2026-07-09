# Source Generated with Decompyle++
# File: get_ship_cost_of_sub_base.pyc (Python 3.11)

ship_utils = ship_utils
import common
sub_fleet_utils = sub_fleet_utils
import data_manager
num = 0
ship_in_this_building = ship_utils.get_building_ships(building_id_u)
for ship_id_u, ship_record in six.iteritems(ship_in_this_building):
    ship_id = ship_record[ShipField.SHIP_ID]
    ship_cfg_record = Tb_cfg_ship.get(ship_id)
    if ship_cfg_record:
        ship_type = ship_cfg_record[Tb_cfg_ship.SHIP_TYPE]
        if ship_type in (CfgShipTypeField.ShipType.SHIP_TYPE_DRONE, CfgShipTypeField.ShipType.SHIP_TYPE_BASE_SHIP):
            continue
        ship_level = SHIP_TYPE_LEVEL.get(ship_type)
        if ship_level in ship_utils.ENGINEER_SHIP_LEVEL_COST:
            continue
        if include_aircraft and ship_level == CfgShipTypeField.ShipLevel.SHIP_LEVEL_AIRCRAFT:
            continue
        num += 1
    total_cost = sub_fleet_utils.get_sub_base_all_ship_cost(building_id_u)
    max_cost = get_user_max_cost(building_id_u)
    return (total_cost, max_cost, num)
