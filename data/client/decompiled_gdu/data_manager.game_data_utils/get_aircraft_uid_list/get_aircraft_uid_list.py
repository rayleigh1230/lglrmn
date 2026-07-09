# Source Generated with Decompyle++
# File: get_aircraft_uid_list.pyc (Python 3.11)

if not strategy:
    pass
strategy = BaseStratege()
ship_utils = ship_utils
import common
if not user_id:
    user_id = GameDataMgr().user_id
aircraft_uid_list = []
ship_table = GameDataMgr().get_table(TableID.SHIP)
for ship_uid, ship_record in six.iteritems(ship_table):
    if ship_record[ShipField.USERID] != user_id:
        continue
    if ship_utils.is_ship_belong_to_building(building_id, ship_record, strategy = strategy):
        ship_id = ship_record[ShipField.SHIP_ID]
        ship_cfg = Tb_cfg_ship.get(ship_id)
        if ship_cfg:
            ship_type = ship_cfg[Tb_cfg_ship.SHIP_TYPE]
            ship_level = SHIP_TYPE_LEVEL.get(ship_type)
            this_aircraft_type = ship_cfg[Tb_cfg_ship.AIRCRAFT_TYPE]
            if ship_level and ship_level == CfgShipTypeField.ShipLevel.SHIP_LEVEL_AIRCRAFT:
                if aircraft_type:
                    aircraft_uid_list.append(ship_uid)
                    continue
                if this_aircraft_type == aircraft_type:
                    aircraft_uid_list.append(ship_uid)
    return aircraft_uid_list
