# Source Generated with Decompyle++
# File: has_signed_identify_agreement.pyc (Python 3.11)

record = GameDataMgr().get_record(TableID.USER_CONTRACT_PERSONAL, GameDataMgr().user_id)
return record is not None
