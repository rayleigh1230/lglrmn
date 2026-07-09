# Source Generated with Decompyle++
# File: get_aircraft_and_boat_of_team.pyc (Python 3.11)

aicrafts = {
    CfgShipTypeField.ShipType.SHIP_TYPE_FIGHTER: { },
    CfgShipTypeField.ShipType.SHIP_TYPE_BOAT: { } }
ship_utils = ship_utils
import common
ship_table = GameDataMgr().get_table(TableID.SHIP)
for ship_id_u, ship_record in six.iteritems(ship_table):
    if ship_record[ShipField.TEAM_ID] == team_id and ship_record[ShipField.USERID] == user_id and ship_utils.is_aircraft(ship_record[ShipField.SHIP_ID]):
        ship_id = ship_record[ShipField.SHIP_ID]
        ship_cfg = Tb_cfg_ship.get(ship_id)
        ship_type = ship_cfg[Tb_cfg_ship.SHIP_TYPE]
        if ship_id not in aicrafts[ship_type]:
            aicrafts[ship_type][ship_id] = set()
        aicrafts[ship_type][ship_id].add(ship_id_u)
    return aicrafts
