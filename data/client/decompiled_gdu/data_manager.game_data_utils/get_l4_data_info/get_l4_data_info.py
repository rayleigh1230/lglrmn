# Source Generated with Decompyle++
# File: get_l4_data_info.pyc (Python 3.11)

res_record = GameDataMgr().get_record(TableID.USER_RES, GameDataMgr().user_id)
if res_record:
    return (res_record[UserResField.L4_DATA_CUR], res_record[UserResField.L4_DATA_MAX], 0)
