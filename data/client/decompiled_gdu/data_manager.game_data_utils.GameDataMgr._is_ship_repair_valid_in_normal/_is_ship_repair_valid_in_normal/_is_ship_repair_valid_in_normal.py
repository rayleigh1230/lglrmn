# Source Generated with Decompyle++
# File: _is_ship_repair_valid_in_normal.pyc (Python 3.11)

if not strategy:
    pass
strategy = BaseStratege()
ship_utils = ship_utils
import common
game_data_utils = game_data_utils
import data_manager
team_id = ship_record[ShipField.TEAM_ID]
ship_id_u = ship_record[ShipField.SHIP_ID_U]
valid = False
if team_id:
    team_record = GameDataMgr().get_record(TableID.TEAM, team_id)
    if team_record or team_record[TeamField.STATE] == TeamField.State.STATE_STATIC:
        if team_record[TeamField.ACTION] == TeamField.Action.ACTION_PARK:
            if team_record[TeamField.TEAM_TYPE] == TeamField.Type.TYPE_BASE:
                valid = False
            else:
                valid = True
        elif team_record[TeamField.ACTION] == TeamField.Action.ACTION_NONE:
            if team_record[TeamField.TEAM_TYPE] == TeamField.Type.TYPE_AIRCRAFT_GUARD_TEAM:
                valid = True
            else:
                team_attr = GameDataMgr().get_record(TableID.TEAM_ATTR, team_id)
                if team_attr and team_attr[TeamAttrField.REPAIR_QUEUE] != '':
                    repair_queue = game_data_utils.parse_cfg_str_to_list(team_attr[TeamAttrField.REPAIR_QUEUE])
                    if ship_id_u in repair_queue and repair_queue.index(ship_id_u) < team_attr[TeamAttrField.REPAIR_QUEUE_LIMT]:
                        valid = True
                    else:
                        ship_type = ship_utils.get_ship_type_by_ship_id_u(ship_id_u, strategy = strategy)
                        if ship_type or ship_type == CfgShipTypeField.ShipType.SHIP_TYPE_BASE_SHIP:
                            valid = False
                        elif ship_record[ShipField.BELONG_ID] == 0:
                            valid = False
                        else:
                            valid = True
if valid:
    building_id = game_data_utils.get_player_base_building_id()
    player_city_record = GameDataMgr().get_record(TableID.USER_CITY, building_id)
    valid = game_data_utils.is_auto_repair_validate(ship_record, building_id, player_city_record, strategy = strategy)
return valid
