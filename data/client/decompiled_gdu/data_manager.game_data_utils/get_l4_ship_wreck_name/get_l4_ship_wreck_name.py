# Source Generated with Decompyle++
# File: get_l4_ship_wreck_name.pyc (Python 3.11)

Tb_cfg_ship_blueprint = Tb_cfg_ship_blueprint
import common.config.db
cfg_ship_blueprint = Tb_cfg_ship_blueprint.get(ship_blueprint_id)
desc = cfg_ship_blueprint[Tb_cfg_ship_blueprint.DESC]
first_name = desc.split('-')[0]
ship_id = cfg_ship_blueprint[Tb_cfg_ship_blueprint.SHIP_ID]
ship_cfg_record = Tb_cfg_ship.get(ship_id)
ship_type = ship_cfg_record[Tb_cfg_ship.SHIP_TYPE]
if ship_type not in (CfgShipTypeField.ShipType.SHIP_TYPE_BATTLE_CRUISER, CfgShipTypeField.ShipType.SHIP_TYPE_CARRIER):
    first_name = '{}-{}'.format(first_name, cfg_ship_blueprint[Tb_cfg_ship_blueprint.TYPE_NAME])
return language.TYPE_SHIP_CHIP.format(first_name)
