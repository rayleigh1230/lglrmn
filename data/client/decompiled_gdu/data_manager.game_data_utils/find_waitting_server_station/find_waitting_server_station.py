# Source Generated with Decompyle++
# File: find_waitting_server_station.pyc (Python 3.11)

organization_utils = organization_utils
import data_manager.organization
grid_idx_g2 = (0, 0)
team_id = None
building_id = None
game_data_mgr = GameDataMgr()
user_record = game_data_mgr.get_record(TableID.USER, game_data_mgr.user_id)
if user_record:
    in_organization = bool(organization_utils.get_user_unique_organization_id())
    wait_server_station_id = user_record[UserField.WAIT_SERVER_STATION_ID]
    if in_organization:
        if len(game_data_mgr.organization_hub_info) > 0 and game_data_mgr.organization_hub_info[0]:
            server_station_id = game_data_mgr.organization_hub_info[0]
        else:
            print('>>>>>>>>>>>>>>>>server union data error')
            server_station_id = wait_server_station_id
    else:
        server_station_id = wait_server_station_id
    station_cfg = Tb_cfg_meta_world_item.get(server_station_id)
    home_base_wid = station_cfg[Tb_cfg_meta_world_item.POS]
    home_base_coordinate = station_cfg[Tb_cfg_meta_world_item.COORDINATE]
    home_base_grid_idx_g2 = map_utils.wid_with_coordinate_to_index_g2(home_base_wid, home_base_coordinate)
    building_id = server_station_id
    if home_base_grid_idx_g2:
        grid_idx_g2 = home_base_grid_idx_g2
return (grid_idx_g2, team_id, building_id)
