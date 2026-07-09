# Source Generated with Decompyle++
# File: get_user_neutral_contract_cooperation_communicating_outpost_ids.pyc (Python 3.11)

records = get_user_neutrality_contract_cooperation_records()
ret = { }
if records:
    for record in records:
        wid_str = record[UserNeutralityCooperationField.COMMUNICATING_INFO]
        if wid_str:
            info_list = parse_cfg_str_to_list_of_list(wid_str, True)
            for outpost_info in info_list:
                ret[outpost_info[0]] = (outpost_info[1], record[UserNeutralityCooperationField.UNION_ID])
                return ret
