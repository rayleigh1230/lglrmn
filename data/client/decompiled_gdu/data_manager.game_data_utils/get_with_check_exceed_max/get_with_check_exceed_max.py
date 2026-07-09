# Source Generated with Decompyle++
# File: get_with_check_exceed_max.pyc (Python 3.11)

is_res_exceed = is_res_exceed_max_after_get(res_dic)
is_ship_exceed_cost = is_ship_exceed_max_after_get(res_dic)
is_ship_exceed_service = is_ship_exceed_max_service(res_dic)
guide_mgr = guide_mgr
import data_manager
if not (guide_mgr.is_in_guide() or is_res_exceed) and is_ship_exceed_cost and is_ship_exceed_service:
    _get_reward_cmd()
    return None
pack_res_dict = None
for res_type, res_num in six.iteritems(res_dic):
    if res_type in (CfgResDefField.ResId.RES_ID_BP_RESEARCH_TREE_PACK, CfgResDefField.ResId.RES_ID_BP_RESEARCH_TREE_PACK_SP):
        pack_res_dict[res_type] = res_num
    if is_res_exceed_max_after_get(pack_res_dict):
        GameEventManager().notify('tree_pack_num_max')
        return None
    if not None:
        tips = language.RES_EXCEED_MAX
        if is_res_exceed:
            if is_ship_exceed_cost or is_ship_exceed_service:
                tips = language.RES_AND_SHIP_EXCEED_MAX_TIPS
            elif is_ship_exceed_service:
                tips = language.SHIP_EXCEED_MAX_SERVICE
            elif is_ship_exceed_cost:
                tips = language.SHIP_EXCEED_MAX_TIPS
audio_config = audio_config
import common.config
ui_mgr = ui_mgr
import common.ui
audio_mgr = audio_mgr
import game_audio
cross_conquer_utils = cross_conquer_utils
import data_manager.cross_conquer
mixed_gf_utils = mixed_gf_utils
import data_manager.mixed_galaxy_field
if not tips:
    get_tip = get_repairs_overstep_tip(res_dic)
    tips = get_tip if get_tip != '' else tips
if mixed_gf_utils.is_in_mixed_gf_sp_galaxy():
    is_mix_gf_no_base = not cross_conquer_utils.has_branch_base(GameDataMgr().user_id)
    if is_mix_gf_no_base:
        tips = language.RES_LOST_TIPS_IN_MIX_GF
if tips:
    audio_mgr.get_sound_mgr().play_event(audio_config.SoundEvent.PLAY_WINDOW_OPEN)
    res_dict = None
    if is_res_exceed:
        res_dict = get_res_exceed_num(res_dic)
    if is_ship_exceed_cost or is_ship_exceed_service:
        ship_exceed_info = get_ship_exceed_cost_info(res_dic)
        if ship_exceed_info:
            if res_dict:
                res_dict = { }
            res_dict[CfgResDefField.ResId.RES_ID_SHIP] = ship_exceed_info
    dlg = ui_mgr.UIMgr().open_ui('ui.common_confirmation_view.CommonConfirmationView')
    dlg.set_data(tips_text = tips, confirm_callback = _get_reward_cmd, discard_res = res_dict, cancel_text = cancel_text, confirm_text = confirm_text, cancel_callback = cancel_callback, is_bg_touch_close = is_bg_touch_close)
    if confirm_disabled:
        dlg.confirm_btn.setBright(False)
        return None
    return None
