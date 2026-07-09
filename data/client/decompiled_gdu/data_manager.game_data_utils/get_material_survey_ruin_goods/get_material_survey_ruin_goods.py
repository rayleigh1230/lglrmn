# Source Generated with Decompyle++
# File: get_material_survey_ruin_goods.pyc (Python 3.11)

reward_drop_utils = reward_drop_utils
import data_manager.res_info.reward_drop
MaterialSurveyDataMgr = MaterialSurveyDataMgr
import data_manager.situation.situation_activity.material_survey.material_survey_data_mgr
intel = MaterialSurveyDataMgr().get_accepted_intel()
if not intel:
    return []
intel_cfg = None.get(intel.cfg_id)
reward_id = intel_cfg[Tb_cfg_material_intel.REWARD_ID]
reward_merge_list = reward_drop_utils.get_drop_res_merge_list(reward_id)
ResId = CfgResDefField.ResId
reward_list = []
is_exist_asset_pack_sp = False
for reward in reward_merge_list:
    if reward.RES_TYPE == ResId.RES_ID_ASSET_PACK_SP and is_exist_asset_pack_sp:
        continue
    if reward.RES_TYPE == ResId.RES_ID_ASSET_PACK_SP:
        is_exist_asset_pack_sp = True
    icon_path = reward.res_icon
    if reward.RES_TYPE in (ResId.RES_ID_ASSET_PACK, ResId.RES_ID_LEGACY_ITEM, ResId.RES_ID_PAINTING, ResId.RES_ID_ASSET_PACK_SP):
        icon_path = ResInfo.get_res_icon(reward.RES_TYPE)
    reward_list.append({
        'res_type': reward.RES_TYPE,
        'res_id': reward.res_id,
        'icon': icon_path,
        'name': reward.res_name })
    return reward_list
