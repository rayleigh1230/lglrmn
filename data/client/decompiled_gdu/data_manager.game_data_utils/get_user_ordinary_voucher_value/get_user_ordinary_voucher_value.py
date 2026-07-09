# Source Generated with Decompyle++
# File: get_user_ordinary_voucher_value.pyc (Python 3.11)

user_ex_record = GameDataMgr().get_record(TableID.USER_STUFF_EX, GameDataMgr().user_id)
if user_ex_record:
    voucher = parse_cfg_str_to_dict_of_list(user_ex_record[UserStuffExField.VOUCHER], True, False, { })
    return voucher.get(CfgResDefField.ResId.RES_ID_ORDINARY_VOUCHER, 0)
