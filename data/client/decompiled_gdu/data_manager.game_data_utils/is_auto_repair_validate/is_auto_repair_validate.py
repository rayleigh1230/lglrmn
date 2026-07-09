# Source Generated with Decompyle++
# File: is_auto_repair_validate.pyc (Python 3.11)

if not strategy:
    pass
strategy = BaseStratege()
team_utils = team_utils
ship_utils = ship_utils
import common
belong_id = ship_utils.get_ship_belong_id(ship_record, strategy = strategy)
ship_id = ship_record[ShipField.SHIP_ID]
cfg_ship_data = Tb_cfg_ship.get(ship_id)
ship_type = cfg_ship_data[Tb_cfg_ship.SHIP_TYPE]
ship_id_u = ship_record[ShipField.SHIP_ID_U]
need_update = False
if belong_id == player_base_building_id:
    unlock_ship_type_repair = parse_cfg_str_to_list(player_city_record[UserCityField.UNLOCK_SHIP_TYPE_REPAIR], True)
    is_basic_repair_enabled = check_auto_basic_repair_enabled()
    if not ship_type in unlock_ship_type_repair:
        need_update = is_basic_repair_enabled
    elif belong_id in GameDataMgr().shipyard_fix_info:
        unlock_ship_type_repair = GameDataMgr().shipyard_fix_info[belong_id][UserCityField.UNLOCK_SHIP_TYPE_REPAIR]
        unlock_ship_type_repair = parse_cfg_str_to_list(unlock_ship_type_repair, True)
        need_update = ship_type in unlock_ship_type_repair
    elif not belong_id != 0 and is_player_home_base(belong_id):
        unlock_ship_type_repair = parse_cfg_str_to_list(player_city_record[UserCityField.UNLOCK_SHIP_TYPE_REPAIR], True)
        is_basic_repair_enabled = check_auto_basic_repair_enabled()
return need_update
