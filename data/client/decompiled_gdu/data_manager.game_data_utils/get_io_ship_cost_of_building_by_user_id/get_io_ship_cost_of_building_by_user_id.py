# Source Generated with Decompyle++
# File: get_io_ship_cost_of_building_by_user_id.pyc (Python 3.11)

ship_utils = ship_utils
import common
ship_table = GameDataMgr().get_table(TableID.SHIP)
total_cost = 0
for ship_id_u, ship_record in six.iteritems(ship_table):
    if ship_record[ShipField.USERID] != user_id:
        continue
    ship_id = ship_record[ShipField.SHIP_ID]
    ship_cfg_record = Tb_cfg_ship.get(ship_id)
    if ship_cfg_record:
        ship_type = ship_cfg_record[Tb_cfg_ship.SHIP_TYPE]
        if ship_type == CfgShipTypeField.ShipType.SHIP_TYPE_DRONE:
            continue
        if ship_type == CfgShipTypeField.ShipType.SHIP_TYPE_BASE_SHIP:
            continue
        ship_level = SHIP_TYPE_LEVEL.get(ship_type)
        if ship_level == CfgShipTypeField.ShipLevel.SHIP_LEVEL_AIRCRAFT:
            continue
        if include_outside_produce_ship and ship_utils.is_ship_from_endurance(ship_record):
            continue
        total_cost += ship_utils.get_ship_cost_from_ship_record(ship_record)
    return total_cost
