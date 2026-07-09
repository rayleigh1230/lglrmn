# Source Generated with Decompyle++
# File: get_ship_list_by_bp_id.pyc (Python 3.11)

blueprint_utils = blueprint_utils
import common
_list = []
ship_table = GameDataMgr().get_table(TableID.SHIP)
for ship_id_u, ship_record in six.iteritems(ship_table):
    if ship_record[ShipField.USERID] == GameDataMgr().user_id:
        ship_id = ship_record[ShipField.SHIP_ID]
        if blueprint_utils.get_bp_cfg_id(ship_id) == bp_id:
            _list.append(ship_record)
    return _list
