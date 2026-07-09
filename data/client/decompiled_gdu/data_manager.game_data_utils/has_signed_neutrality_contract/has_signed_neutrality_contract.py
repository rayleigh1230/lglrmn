# Source Generated with Decompyle++
# File: has_signed_neutrality_contract.pyc (Python 3.11)

record = GameDataMgr().get_record(TableID.USER_CONTRACT_PERSONAL, GameDataMgr().user_id)
if not record:
    return False
return None[UserContractPersonalField.CONTRACT_ID] == UserContractPersonalField.IdContract.ID_CONTRACT_NEUTRALITY
