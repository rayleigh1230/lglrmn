# Source Generated with Decompyle++
# File: check_server_special_status_param.pyc (Python 3.11)

if not server_param:
    return True
if None == SysParamField.BanType.BAN_TYPE_REVIEW_SERVER:
    param_list = parse_cfg_str_to_list_of_list(server_param)
    if len(param_list) < 2:
        return True
    SDKMgr = SDKMgr
    import sdk.sdk_mgr
    ban_app_channel_list = param_list[0]
    ban_version_list = param_list[1]
    cur_channel = SDKMgr().app_channel_name
    cur_version = common_config.get_engine_svn_ver_num()
    channel_flag = True
    version_flag = True
    if len(ban_app_channel_list) > 0:
        channel_flag = False
        for app_channel in ban_app_channel_list:
            if cur_channel == app_channel:
                channel_flag = True
                continue
            if len(ban_version_list) > 0:
                version_flag = False
                for version in ban_version_list:
                    version_num = int(version)
                except ValueError:
                    print('[ERROR] BAN_TYPE_BONFIRE server_param version convert failed : ', version)
                    continue
                if cur_version == version_num:
                    version_flag = True
                    continue
                continue
    if channel_flag:
        return version_flag
    if channel_flag == SysParamField.BanType.BAN_TYPE_REVIEW_SERVER_ACTIVITY_PAGE:
        param_ls = parse_cfg_str_to_list_of_list(server_param)
        if len(param_ls) < 3:
            return False
        SDKMgr = SDKMgr
        import sdk.sdk_mgr
        cur_activity_id = client_param
        activity_id_ls = param_ls[2]
        engine_ver_ls = param_ls[1]
        channel_name_ls = param_ls[0]
        if str(cur_activity_id) not in activity_id_ls and SDKMgr().app_channel_name not in channel_name_ls or str(common_config.get_engine_svn_ver_num()) not in engine_ver_ls:
            return False
        return None
    return None
