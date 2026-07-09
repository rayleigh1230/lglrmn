# Source Generated with Decompyle++
# File: get_world_item_base_info.pyc (Python 3.11)

building_record = GameDataMgr().get_record(TableID.WORLD_ITEM, item_id)
is_asteroid = False
is_static = False
cfg_guard_id = None
if not building_record:
    get_planet_world_item_base_info = get_planet_world_item_base_info
    import ui.planet_landing.planet_landing_team_utils
    planet_base_info = get_planet_world_item_base_info(item_id)
    cfg_star = Tb_cfg_star.get(item_id)
    if planet_base_info:
        return planet_base_info
    if None:
        is_asteroid = True
        world_item_type = WorldItemField.Type.TYPE_ASTEROID
        building_name = cfg_star[Tb_cfg_star.NAME]
        building_table = GameDataMgr().get_table(TableID.WORLD_ITEM)
        for world_item_id, record in six.iteritems(building_table):
            pos = record[WorldItemField.POS]
            if record[WorldItemField.ITEM_TYPE] == world_item_type and pos == item_id:
                building_record = record
                cfg_guard_id = building_record[WorldItemField.CFG_GUARD_ID]
            
    building_record = Tb_cfg_meta_world_item.get(item_id)
    if building_record:
        is_static = True
        world_item_type = building_record[Tb_cfg_meta_world_item.ITEM_TYPE]
        building_name = building_record[Tb_cfg_meta_world_item.NAME]
    else:
        world_item_type = 0
        building_name = ''
else:
    world_item_type = building_record[WorldItemField.ITEM_TYPE]
    building_name = building_record[WorldItemField.NAME]
    cfg_guard_id = building_record[WorldItemField.CFG_GUARD_ID]
    is_asteroid = world_item_type == WorldItemField.Type.TYPE_ASTEROID
return {
    'is_static': is_static,
    'is_asteroid': is_asteroid,
    'world_item_type': world_item_type,
    'building_name': building_name,
    'cfg_guard_id': cfg_guard_id,
    'building_record': building_record }
