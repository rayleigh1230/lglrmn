# Source Generated with Decompyle++
# File: callback.pyc (Python 3.11)

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
