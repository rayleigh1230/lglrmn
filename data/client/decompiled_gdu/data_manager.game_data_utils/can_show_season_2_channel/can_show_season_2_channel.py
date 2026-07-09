# Source Generated with Decompyle++
# File: can_show_season_2_channel.pyc (Python 3.11)

contract_record = GameDataMgr().get_record(TableID.USER_CONTRACT, GameDataMgr().user_id)
if contract_record and contract_record[UserContractField.CONTRACT_ID] == CfgContractField.IdContract.ID_CONTRACT_202:
    return True
