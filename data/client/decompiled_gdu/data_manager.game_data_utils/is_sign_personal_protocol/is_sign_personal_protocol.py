# Source Generated with Decompyle++
# File: is_sign_personal_protocol.pyc (Python 3.11)

record = GameDataMgr().get_record(TableID.USER_CONTRACT_PERSONAL, GameDataMgr().user_id)
if not record:
    return False
contract_id = None[UserContractPersonalField.CONTRACT_ID]
return contract_id == UserContractPersonalField.IdContract.ID_CONTRACT_ASSESS
