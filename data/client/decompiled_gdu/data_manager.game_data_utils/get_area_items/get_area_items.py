# Source Generated with Decompyle++
# File: get_area_items.pyc (Python 3.11)

if item_type in (WorldItemField.Type.TYPE_ASTEROID,):
    return _get_area_asteroid_list(area_g2_idx, area_radius, area_type, item_type)
if None in (WorldItemField.Type.TYPE_PLAYER_BASE, WorldItemField.Type.TYPE_LIAISON_STATION, WorldItemField.Type.TYPE_LIAISON_STATION_OUTSIDE, WorldItemField.Type.TYPE_DEPOT, WorldItemField.Type.TYPE_DEPOT_WEAPON, WorldItemField.Type.TYPE_DEPOT_QUICKLY, WorldItemField.Type.TYPE_DEPOT_LARGE):
    return _get_area_world_item_list(area_g2_idx, area_radius, area_type, item_type)
