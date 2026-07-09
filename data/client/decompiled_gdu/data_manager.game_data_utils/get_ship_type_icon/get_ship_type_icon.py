# Source Generated with Decompyle++
# File: get_ship_type_icon.pyc (Python 3.11)

ship_config = Tb_cfg_ship.get(ship_id)
if ship_config:
    ship_type = ship_config[Tb_cfg_ship.SHIP_TYPE]
    return SHIP_TYPE_ICON_FILE[ship_type]
