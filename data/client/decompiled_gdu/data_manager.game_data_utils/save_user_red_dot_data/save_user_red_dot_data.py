# Source Generated with Decompyle++
# File: save_user_red_dot_data.pyc (Python 3.11)

if ';' in store_value:
    print('[Error] Try to store semicolon in user red dot data, which is forbidden')
    return None
if None(store_value) > 200:
    print('[Error] User red dot value exceeds maximum 100 length')
    return None
protocol = protocol
import common.config.network
NetCmdMgr = NetCmdMgr
import core_framework.my_network.net_cmd_mgr
save_protocol = protocol.RedDotMark(red_dot_type, red_dot_key, store_value)
if callback:
    NetCmdMgr().send_protocol_with_callback(save_protocol, callback, reg_name)
    return None
NetCmdMgr().send_protocol(save_protocol)
