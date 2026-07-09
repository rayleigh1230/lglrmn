# Source Generated with Decompyle++
# File: get_user_neutrality_contract_cooperation_records.pyc (Python 3.11)

records = []
table = GameDataMgr().get_table(TableID.USER_NEUTRALITY_COOPERATION)
if not table:
    return records
for key in None:
    record = table[key]
    if record[UserNeutralityCooperationField.USERID] == GameDataMgr().user_id:
        records.append(record)
    return records
