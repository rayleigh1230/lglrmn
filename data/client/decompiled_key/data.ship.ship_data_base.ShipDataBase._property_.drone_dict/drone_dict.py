# Source Generated with Decompyle++
# File: drone_dict.pyc (Python 3.11)

get_ship_type_by_ship_id = get_ship_type_by_ship_id
import common.ship_utils
game_data_utils = game_data_utils
import data_manager
drone_dict_str = ''
battle_ship_data = GameDataMgr().get_record(ClientBattleTableID.CLIENT_BATTLE_SHIP, self.ship_uid)
if battle_ship_data:
    drone_dict_str = battle_ship_data[ClientBattleShipField.AIRCRAFTS]
drone_dict = game_data_utils.parse_cfg_str_to_dict_of_list(drone_dict_str, is_num = True, is_force_list = True)
ship_uid_belonged_to_me = GameDataMgr().get_sub_key_data(ClientBattleTableID.CLIENT_BATTLE_SHIP, ShipField.BELONG_SHIP_ID_U, self.ship_uid)
for aircraft_ship_uid in ship_uid_belonged_to_me:
    battle_ship_record = GameDataMgr().get_record(ClientBattleTableID.CLIENT_BATTLE_SHIP, aircraft_ship_uid)
    cur_aircraft_list = drone_dict.setdefault(battle_ship_record[ClientBattleShipField.BELONG_SHIP_SLOT_IDX], [])
    if aircraft_ship_uid not in cur_aircraft_list:
        cur_aircraft_list.append(aircraft_ship_uid)
    return drone_dict
