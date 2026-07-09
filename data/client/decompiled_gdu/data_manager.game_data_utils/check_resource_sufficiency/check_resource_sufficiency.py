# Source Generated with Decompyle++
# File: check_resource_sufficiency.pyc (Python 3.11)

user_id = GameDataMgr().user_id
user_record = GameDataMgr().get_record(TableID.USER, user_id)
user_res_record = GameDataMgr().get_record(TableID.USER_RES, user_id)
res_lookup_dict = {
    CfgResDefField.ResId.RES_ID_PROXIMA_COIN: user_record[UserField.PROXIMA_COIN],
    CfgResDefField.ResId.RES_ID_COIN: user_res_record[UserResField.COIN_CUR] }
insufficient_type_list = []
for res_type, amount in six.iteritems(res_cost_dict):
    if res_type in res_lookup_dict and res_lookup_dict[res_type] < amount:
        insufficient_type_list.append(res_type)
    return insufficient_type_list
