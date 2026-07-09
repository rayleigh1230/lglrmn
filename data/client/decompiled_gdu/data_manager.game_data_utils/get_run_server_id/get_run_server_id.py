# Source Generated with Decompyle++
# File: get_run_server_id.pyc (Python 3.11)

if not g_run_server_id:
    LoginDataMgr = LoginDataMgr
    import login.login_data_mgr
    ServerKeyField = ServerKeyField
    import ui.server_select_view
    g_run_server_id = LoginDataMgr().get_selected_server_info()[ServerKeyField.Run_Server_Id]
return g_run_server_id
