# Source Generated with Decompyle++
# File: get_res_icon_novice_deal.pyc (Python 3.11)

get_mainview_mode_setting = get_mainview_mode_setting
MainViewUIMode = MainViewUIMode
import common.config.common_config
ui_mode = get_mainview_mode_setting()
if ui_mode == MainViewUIMode.MODE_STANDARD:
    return ResInfo.RES_ICON_NOVICE_DEAL.get(res_id)
