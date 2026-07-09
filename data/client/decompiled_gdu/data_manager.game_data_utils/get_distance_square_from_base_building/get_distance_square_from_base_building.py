# Source Generated with Decompyle++
# File: get_distance_square_from_base_building.pyc (Python 3.11)

(ax, ay) = map_utils.wid_to_index_l2(wid)
(base_wid, _) = get_player_base_building_wid()
base_l2 = map_utils.wid_to_index_l2(base_wid)
return (ax - base_l2[0]) ** 2 + (ay - base_l2[1]) ** 2
