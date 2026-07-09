# Source Generated with Decompyle++
# File: find_nearest_green_region_npc_space_station.pyc (Python 3.11)

L0RegionForceId = L0RegionForceId
import common.config.shared_definition
base_wid = None
base_coord = None
space_station_list = []
space_station_type = (WorldItemField.Type.TYPE_NPC_CITY, WorldItemField.Type.TYPE_NPC_CITY_SINGLE, WorldItemField.Type.TYPE_NPC_TRADE_PORT, WorldItemField.Type.TYPE_NPC_DEFENCE_PORT)
force_id_dict = { }

def try_check_union_id(union_id = None):
    if union_id in force_id_dict:
        return force_id_dict.get(union_id) == L0RegionForceId.GREEN_REGION_FORCE_ID
    npc_union_cfg = None.get(union_id)
    if not npc_union_cfg:
        return False
    force_id = None[Tb_cfg_npc_union.ORIGIN_ID]
    force_id_dict[union_id] = force_id
    return force_id == L0RegionForceId.GREEN_REGION_FORCE_ID

world_item_table = GameDataMgr().get_table(TableID.WORLD_ITEM)
self_user_id = GameDataMgr().user_id
for building_id, record in six.iteritems(world_item_table):
    if record[WorldItemField.USERID] == self_user_id and record[WorldItemField.ITEM_TYPE] == WorldItemField.Type.TYPE_PLAYER_BASE:
        base_wid = record[WorldItemField.POS]
        base_coord = record[WorldItemField.COORDINATE]
    if record[WorldItemField.ITEM_TYPE] in space_station_type and try_check_union_id(record[WorldItemField.UNION_ID]):
        pos = record[WorldItemField.POS]
        coord = record[WorldItemField.COORDINATE]
        space_station_list.append((building_id, pos, coord))
    meta_world_item_table = Tb_cfg_meta_world_item.get_all_data()
    for cfg_meta_id, meta_record in six.iteritems(meta_world_item_table):
        if meta_record.get(Tb_cfg_meta_world_item.ITEM_TYPE, 0) in space_station_type:
            union_id = GameDataMgr().get_npc_city_union_id(cfg_meta_id)
            if try_check_union_id(union_id):
                coord = meta_record.get(Tb_cfg_meta_world_item.COORDINATE, 100000000)
                space_station_list.append((cfg_meta_id, meta_record[Tb_cfg_meta_world_item.POS], coord))
        if not base_wid:
            return (0, 0, 0)
        base_wpos = None.wid_with_coordinate_to_world_position(base_wid, base_coord)
        if space_station_list:
            
            def sort_func(space_station_info = None):
                (space_station_id, space_station_wid, space_station_coord) = space_station_info
                station_pos = map_utils.wid_with_coordinate_to_world_position(space_station_wid, space_station_coord)
                return (base_wpos - station_pos).length_sqr

            space_station_list.sort(key = sort_func)
            return space_station_list[0]
        return None
