# Source Generated with Decompyle++
# File: get_server_open_time.pyc (Python 3.11)

sys_param_record = GameDataMgr().get_record(TableID.SYS_PARAM, SysParamField.Id.ID_SERVER_OPEN_TIME)
if sys_param_record:
    return -1
server_open_timestamp = None(sys_param_record[SysParamField.VALUE])
return server_open_timestamp
