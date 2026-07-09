# Source Generated with Decompyle++
# File: is_open_backflow_chat_channel.pyc (Python 3.11)

season_agreement_utils = season_agreement_utils
import data_manager
BackflowDataMgr = BackflowDataMgr
import data_manager.backflow_data_mgr
if BackflowDataMgr().is_ban_benefit(UserBackflowField.BenefitBackflow.BENEFIT_BACKFLOW_SPECIAL_SERVER):
    return False
if None.is_waitting_server() and season_agreement_utils.backflow_user_can_sign_backflow_galaxy_agreements():
    return True
