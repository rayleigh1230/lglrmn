# Source Generated with Decompyle++
# File: get_npc_delta_y.pyc (Python 3.11)

delta_y = 0
if not cfg_id:
    MapItemsDataManager = MapItemsDataManager
    import strategy.map.map_items_data_mgr
    cfg_id = MapItemsDataManager().get_npc_city_cfg_id(city_id)
if cfg_id:
    model_cfg = cfg_building_model.get(cfg_id)
    if model_cfg:
        model_file = model_cfg[cfg_building_model.M1]
        MAP_NPC_EXTRA_TRANSFORM_DATA = MAP_NPC_EXTRA_TRANSFORM_DATA
        import common.preprocess_data
        custom_transform_data = MAP_NPC_EXTRA_TRANSFORM_DATA.get(model_file)
        if custom_transform_data and custom_transform_data.get('logic_scene_id') in (SCENE_STRATEGY,) and custom_transform_data.get('modify_transform'):
            modify_transform = custom_transform_data.get('modify_transform')
            pos = modify_transform['pos']
            delta_y = pos[1] if pos else 0
return delta_y
