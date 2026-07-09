# Source Generated with Decompyle++
# File: find_any_self_item.pyc (Python 3.11)

team_utils = team_utils
import common
grid_idx_g2 = (0, 0)
team_id = None
building_id = None
game_data_mgr = GameDataMgr()
user_record = game_data_mgr.get_record(TableID.USER, game_data_mgr.user_id)
if user_record:
    home_base_item_id = user_record[UserField.MAIN_WID]
    if is_io_explore and home_base_item_id != 0:
        home_base_record = game_data_mgr.get_record(TableID.WORLD_ITEM, home_base_item_id)
        if home_base_record:
            home_base_wid = home_base_record[WorldItemField.POS]
            home_base_coordinate = home_base_record[WorldItemField.COORDINATE]
            home_base_grid_idx_g2 = map_utils.wid_with_coordinate_to_index_g2(home_base_wid, home_base_coordinate)
            building_id = home_base_item_id
            if home_base_grid_idx_g2:
                grid_idx_g2 = home_base_grid_idx_g2
            else:
                team_table = game_data_mgr.get_table(TableID.TEAM)
                for _team_id, team_record in six.iteritems(team_table):
                    user_id = team_record[TeamField.USERID]
                    if user_id == game_data_mgr.user_id:
                        if is_io_explore and team_record[TeamField.TEAM_TYPE] == TeamField.Type.TYPE_BASE:
                            continue
                        grid_idx_g2 = team_utils.get_team_grid_index_g2(team_record)
                        team_id = _team_id
                    
                    return (grid_idx_g2, team_id, building_id)
