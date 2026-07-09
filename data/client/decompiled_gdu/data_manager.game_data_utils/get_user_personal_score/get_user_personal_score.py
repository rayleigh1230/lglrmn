# Source Generated with Decompyle++
# File: get_user_personal_score.pyc (Python 3.11)

record = GameDataMgr().get_record(TableID.USER_CONTRACT_PERSONAL, GameDataMgr().user_id)
if not record:
    return 0
contract_id = None[UserContractPersonalField.CONTRACT_ID]
contract_score = 0
if contract_id in (UserContractPersonalField.IdContract.ID_CONTRACT_ASSESS,):
    contract_score = get_user_personal_estimate_score()
elif contract_id in (UserContractPersonalField.IdContract.ID_CONTRACT_EXPLORE,):
    contract_score = prospect_data_utils.get_prospect_display_score()
elif contract_id in (UserContractPersonalField.IdContract.ID_CONTRACT_NEUTRALITY,):
    contract_score = get_user_neutral_contract_cooperation_communicated_score()
elif contract_id in (UserContractPersonalField.IdContract.ID_CONTRACT_HUNTER,):
    contract_score = get_user_hunter_contract_score()
return contract_score
