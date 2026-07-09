# Source Generated with Decompyle++
# File: _check_and_send_dock_item_subscribtion.pyc (Python 3.11)

guide_mgr = guide_mgr
sub_fleet_utils = sub_fleet_utils
import data_manager
NetCmdMgr = NetCmdMgr
import core_framework.my_network.net_cmd_mgr
if not guide_mgr.is_all_guide_finish():
    return None
building_ids = None.get_building_list_contain_sub_fleet()
if building_ids:
    req = protocol.TeamDockWorldItemSubscribe(building_ids)
    NetCmdMgr().send_protocol(req)
    return None
