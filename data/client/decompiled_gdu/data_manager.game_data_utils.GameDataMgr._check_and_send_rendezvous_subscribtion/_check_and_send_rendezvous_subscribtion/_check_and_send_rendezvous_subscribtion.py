# Source Generated with Decompyle++
# File: _check_and_send_rendezvous_subscribtion.pyc (Python 3.11)

team_data_utils = team_data_utils
guide_mgr = guide_mgr
import data_manager
NetCmdMgr = NetCmdMgr
import core_framework.my_network.net_cmd_mgr
if not guide_mgr.is_all_guide_finish():
    return None
dock_target_ids = None.get_teams_subscribe_rendezvous_dock_target_ids()
if dock_target_ids:
    req = protocol.TeamSubscribeTeamDock(dock_target_ids)
    NetCmdMgr().send_protocol(req)
    return None
