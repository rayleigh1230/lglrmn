# Source Generated with Decompyle++
# File: get_dock_aircraft_and_boat.pyc (Python 3.11)

if not strategy:
    pass
strategy = BaseStratege()
ship_utils = ship_utils
import common
aicrafts = {
    CfgShipTypeField.ShipType.SHIP_TYPE_FIGHTER: { },
    CfgShipTypeField.ShipType.SHIP_TYPE_BOAT: { } }
ship_table = strategy.get_ship_table()
for ship_id_u, ship_record in six.iteritems(ship_table):
    if ship_utils.is_ship_belong_to_building(building_id, ship_record, strategy = strategy) or ship_record[ShipField.USERID] == user_id or ship_utils.is_aircraft(ship_record[ShipField.SHIP_ID]):
        ship_id = ship_record[ShipField.SHIP_ID]
        ship_cfg = Tb_cfg_ship.get(ship_id)
        ship_type = ship_cfg[Tb_cfg_ship.SHIP_TYPE]
        cost = ship_utils.get_ship_cost_from_ship_record(ship_record)
        if ship_record[ShipField.STATE] != ShipField.State.STATE_NORMAL:
            continue
        if ship_record.get(ShipField.TEAM_ID):
            continue
        if filter_belong and ship_record.get(ShipField.BELONG_SHIP_ID_U):
            continue
        if (ship_id, cost) not in aicrafts[ship_type]:
            aicrafts[ship_type][(ship_id, cost)] = set()
    aicrafts[ship_type][(ship_id, cost)].add(ship_id_u)
    return aicrafts
