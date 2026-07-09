# Source Generated with Decompyle++
# File: get_user_contract_id.pyc (Python 3.11)

record = GameDataMgr().get_record(TableID.USER_CONTRACT, GameDataMgr().user_id)
if not record:
    return 0
return None[UserContractField.CONTRACT_ID]
