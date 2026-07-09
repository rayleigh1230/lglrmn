# Source Generated with Decompyle++
# File: get_user_neutral_contract_cooperation_communicated_score.pyc (Python 3.11)

record = GameDataMgr().get_record(TableID.USER_NEUTRALITY_CONTRACT_DATA, GameDataMgr().user_id)
if record:
    return record[UserNeutralityContractDataField.TOTAL_SCORE]
