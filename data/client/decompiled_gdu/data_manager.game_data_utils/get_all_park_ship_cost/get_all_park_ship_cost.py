# Source Generated with Decompyle++
# File: get_all_park_ship_cost.pyc (Python 3.11)

if not strategy:
    pass
strategy = BaseStratege()
ship_utils = ship_utils
import common
all_cost_normal = 0
all_cost_engineer = 0
ship_table = GameDataMgr().get_table(TableID.SHIP)
for ship_id_u, ship_record in six.iteritems(ship_table):
    if not ship_utils.is_ship_belong_to_building(building_id, ship_record, strategy = strategy) or ship_record[ShipField.STATE] == ShipField.State.STATE_NORMAL or ship_record[ShipField.USERID] == GameDataMgr().user_id or ship_record.get(ShipField.TEAM_ID):
        cfg_ship_record = Tb_cfg_ship.get(ship_record[ShipField.SHIP_ID])
        ship_type = cfg_ship_record[Tb_cfg_ship.SHIP_TYPE]
        if ship_type == CfgShipTypeField.ShipType.SHIP_TYPE_DRONE:
            continue
        ship_level = SHIP_TYPE_LEVEL.get(ship_type)
        if ship_level == CfgShipTypeField.ShipLevel.SHIP_LEVEL_AIRCRAFT:
            continue
        is_engineer_ship = ship_level in (CfgShipTypeField.ShipLevel.SHIP_LEVEL_ENGINEER, CfgShipTypeField.ShipLevel.SHIP_LEVEL_ENGINEER_HEAVY)
        if is_engineer_ship:
            all_cost_engineer += ship_utils.get_ship_cost_from_ship_record(ship_record)
            continue
        all_cost_normal += ship_utils.get_ship_cost_from_ship_record(ship_record)
continue
return (all_cost_normal, all_cost_engineer)
