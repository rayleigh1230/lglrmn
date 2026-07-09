# Source Generated with Decompyle++
# File: get_coproduction_beltline_cam.pyc (Python 3.11)

BlueprintDataMgr = BlueprintDataMgr
import data_manager.blueprint_data_mgr
beltline_record = GameDataMgr().get_record(TableID.BELTLINE, beltline_id_u)
produce_bp_id_u = beltline_record[BeltlineField.PRODUCE_BP_ID_U]
ship_type = 0
if produce_bp_id_u:
    blueprint_data = BlueprintDataMgr().get(beltline_record[BeltlineField.PRODUCE_BP_ID_U])
    ship_config = Tb_cfg_ship.get(blueprint_data.ship_id)
    ship_type = ship_config[Tb_cfg_ship.SHIP_TYPE]
return COPRODUCTION_SHIP_TYPE_TO_CAM_SOCKET.get(ship_type, 'camera_zhanliexunyangjian')
