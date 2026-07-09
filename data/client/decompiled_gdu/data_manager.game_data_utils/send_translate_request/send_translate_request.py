# Source Generated with Decompyle++
# File: send_translate_request.pyc (Python 3.11)

common_config = common_config
import common.config
protocol = protocol
import common.config.network
NetCmdMgr = NetCmdMgr
import core_framework.my_network.net_cmd_mgr
NetMsgQueue = NetMsgQueue
import core_framework.my_network.net_msg_queue

def callback(cmd = None, data = None):
    if not data:
        GameEventManager().notify('toast_text', language.CHAT_TRANSLATE_FAILED)
        return False
    msg_id = None[1]
    error_code = data[2]
    if not data[3]:
        return False
    if None(data[3]) > 1:
        title = data[3][0]
        msg = data[3][1]
    else:
        msg = data[3][0]
        title = 'true'
    if msg_id != id:
        return False
    if None == '' or title == '':
        return True
    if None == 0 or error_code == 3:
        send_callback(data)
    else:
        GameEventManager().notify('toast_text', language.CHAT_TRANSLATE_FAILED)
    return True

NetMsgQueue().unregister_msg(None, reg_name)
if protocol_req:
    req = protocol_req
else:
    req = protocol.Translate(send_type, id, run_server_id, common_config.get_language(), text, string_key)
NetCmdMgr().send_protocol_with_callback(req, callback, reg_name, True)
