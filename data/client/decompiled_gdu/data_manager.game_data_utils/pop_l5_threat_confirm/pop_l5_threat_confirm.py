# Source Generated with Decompyle++
# File: pop_l5_threat_confirm.pyc (Python 3.11)

ui_mgr = ui_mgr
import common.ui
is_check = [
    False]
(save_key, tips) = get_ignore_attack_in_control_area_tips_info()

def cancel():
    pass


def confirm():
    if is_check[0]:
        user_default.set_user_default_for_key(user_default.USER_DEFAULT_FOR_BOOL, save_key, True, True)
    cb()


def check_box_cb():
    is_check[0] = True

confirm_view = ui_mgr.UIMgr().open_ui('ui.common_confirmation_view.CommonConfirmationView')
confirm_view.set_data(tips_text = tips, cancel_text = language.L5_THREAT_CONFIRM_TIPS_BTN_CONFIRM, confirm_text = language.L5_THREAT_CONFIRM_TIPS_BTN_CANCEL, confirm_callback = cancel, cancel_callback = confirm, is_check_box_show = True, check_box_tips = language.NO_MORE_WARING, check_box_callback = check_box_cb, is_cancel_btn_show = True)
