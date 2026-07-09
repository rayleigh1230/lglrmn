# Source Generated with Decompyle++
# File: is_ship_ban_by_target_wid.pyc (Python 3.11)

map_utils = map_utils
import strategy.map
is_in_ban = is_in_ban
import common.base_default_build_team_utils
idx_g3 = map_utils.wid_with_coordinate_to_index_g3(target_wid)
obs_id = map_utils.get_map_obs_id(idx_g3, False)
target_obs_type = map_utils.obs_id_to_obs_type(obs_id)
is_banned = is_in_ban(base_obs_type = None, target_obs_type = target_obs_type, ship_type = ship_type, ship_id = None)
return is_banned
