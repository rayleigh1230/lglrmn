# Source Generated with Decompyle++
# File: is_bp_activation_recover_available.pyc (Python 3.11)


try:
    sys_param_utils = sys_param_utils
    import data_manager
    block_package_channel = block_package_channel
    import sdk.sdk_mgr
    
    try:
        if not sys_param_utils.is_waitting_server():
            return False
        if block_package_channel():
            
            try:
                return False
                get_user_bp_activation_recover = get_user_bp_activation_recover
                import ui.shop_layer.newbie_battlepass_stage_shop_layer
                tb_activation_recover = get_user_bp_activation_recover()
                if tb_activation_recover:
                    return bool(len(tb_activation_recover) > 0)
                except Exception:
                    bool
                    return False



