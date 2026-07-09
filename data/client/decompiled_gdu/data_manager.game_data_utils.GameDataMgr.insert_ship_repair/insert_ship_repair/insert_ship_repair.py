# Source Generated with Decompyle++
# File: insert_ship_repair.pyc (Python 3.11)

if not strategy:
    pass
strategy = BaseStratege()
game_data_utils = game_data_utils
import data_manager
ship_utils = ship_utils
team_utils = team_utils
import common
Tb_cfg_ship = Tb_cfg_ship
import common.config.db
SupportDockDataMgr = SupportDockDataMgr
import data_manager.support_dock_data_mgr
if Tb_cfg_ship._data_module:
    return None
notify_data = None
ship_id_u = ship_record[ShipField.SHIP_ID_U]

def in_shipyard_need_repair():
