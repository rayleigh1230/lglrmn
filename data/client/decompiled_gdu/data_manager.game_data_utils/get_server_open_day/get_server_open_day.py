# Source Generated with Decompyle++
# File: get_server_open_day.pyc (Python 3.11)

param_record = GameDataMgr().get_record(TableID.SYS_PARAM, SysParamField.Id.ID_SERVER_OPEN_TIME)
if not param_record:
    return 0
server_open_time = None(param_record.get(SysParamField.VALUE))
return int((time_utils.get_server_time() - server_open_time) / time_utils.DAY_TIMESPAN)
