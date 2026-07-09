# Source Generated with Decompyle++
# File: get_user_neutrality_contract_data_record.pyc (Python 3.11)

for userid, record in six.iteritems(GameDataMgr().get_table(TableID.USER_NEUTRALITY_CONTRACT_DATA)):
    if userid == GameDataMgr().user_id:
        
        return None, record
    return None
