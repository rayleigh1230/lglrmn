# Source Generated with Decompyle++
# File: is_organization_version_effect.pyc (Python 3.11)

organization_version_effect_time = get_organization_version_effect_time()
if sys_param_utils.is_waitting_server() and time_utils.get_server_time() >= organization_version_effect_time:
    return True
sys_param_record = None().get_record(TableID.SYS_PARAM, SysParamField.Id.ID_SERVER_OPEN_TIME)
server_open_timestamp = 0
if sys_param_record:
    server_open_timestamp = int(sys_param_record[SysParamField.VALUE])
return organization_version_effect_time <= server_open_timestamp
