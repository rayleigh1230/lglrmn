# Source Generated with Decompyle++
# File: is_coproduction_ship.pyc (Python 3.11)

ship_utils = ship_utils
import common
ship_id = self.ship_id
ship_config = Tb_cfg_ship.get(ship_id)
ship_type = ship_config[Tb_cfg_ship.SHIP_TYPE]
return ship_type in ship_utils.get_coproduction_ship_types()
