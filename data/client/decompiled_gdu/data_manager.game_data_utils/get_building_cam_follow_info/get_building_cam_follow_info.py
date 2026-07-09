# Source Generated with Decompyle++
# File: get_building_cam_follow_info.pyc (Python 3.11)

sys_param_utils = sys_param_utils
import data_manager
building_record = GameDataMgr().get_record(TableID.WORLD_ITEM, building_id_u)
building_type = get_building_type_in_show(building_id_u)
if building_type in (WorldItemField.Type.TYPE_NPC_CITY_SINGLE, WorldItemField.Type.TYPE_NPC_DEFENCE_PORT, WorldItemField.Type.TYPE_NPC_CITY, WorldItemField.Type.TYPE_NPC_STARGATE, WorldItemField.Type.TYPE_FAMILY_WAREHOUSE, WorldItemField.Type.TYPE_GUILD_DOCK):
    cfg_building_model = cfg_building_model
    import common.config.client_cfg
    building_cfg = cfg_building_model.get(building_record[WorldItemField.FACADE])
    if building_cfg:
        return (building_cfg[cfg_building_model.CITY_CAM], None)
if building_type in (WorldItemField.Type.TYPE_DEPOT, WorldItemField.Type.TYPE_BEACON, WorldItemField.Type.TYPE_DEPOT_WEAPON, WorldItemField.Type.TYPE_DEPOT_QUICKLY, WorldItemField.Type.TYPE_DEPOT_LARGE, WorldItemField.Type.TYPE_NPC_BASE, WorldItemField.Type.TYPE_ACTIVITY_BEACON, WorldItemField.Type.TYPE_ACTIVITY_COLLECT_BEACON, WorldItemField.Type.TYPE_USER_TRANSFER_NPC_BASE, WorldItemField.Type.TYPE_BUSSINESS_CENTER_BEACON):
    return ('cam_default', None)
if None == WorldItemField.Type.TYPE_PLAYER_BASE and sys_param_utils.is_io_season():
    building_cam_cfg = cfg_building_camera.get(60701)
    return (building_cam_cfg[cfg_building_camera.CAMERA], building_cam_cfg[cfg_building_camera.CENTER])
default_cam = None.get(2301)
building_cam_cfg = default_cam
return (building_cam_cfg[cfg_building_camera.CAMERA], building_cam_cfg[cfg_building_camera.CENTER])
