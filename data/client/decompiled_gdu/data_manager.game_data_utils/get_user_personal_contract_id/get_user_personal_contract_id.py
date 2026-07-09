# Source Generated with Decompyle++
# File: get_user_personal_contract_id.pyc (Python 3.11)

record = GameDataMgr().get_record(TableID.USER_CONTRACT_PERSONAL, GameDataMgr().user_id)
if not record:
    return 0
return None[UserContractPersonalField.CONTRACT_ID]
