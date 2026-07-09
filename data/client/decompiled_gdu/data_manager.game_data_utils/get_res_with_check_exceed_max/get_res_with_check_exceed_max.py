# Source Generated with Decompyle++
# File: get_res_with_check_exceed_max.pyc (Python 3.11)

if is_res_exceed_max_after_get(res_dic):
    guide_mgr = guide_mgr
    import data_manager
    if guide_mgr.is_in_guide():
        _get_reward_cmd()
        return None
    audio_config = audio_config
    import common.config
    ui_mgr = ui_mgr
    import common.ui
    audio_mgr = audio_mgr
    import game_audio
    get_tip = get_repairs_overstep_tip(res_dic)
    tips = get_tip if get_tip != '' else language.RES_EXCEED_MAX
    dlg = ui_mgr.UIMgr().open_ui('ui.common_confirmation_view.CommonConfirmationView')
    res_dict = get_res_exceed_num(res_dic)
    dlg.set_data(tips_text = tips, confirm_callback = _get_reward_cmd, discard_res = res_dict)
    audio_mgr.get_sound_mgr().play_event(audio_config.SoundEvent.PLAY_WINDOW_OPEN)
    return None
_get_reward_cmd()
