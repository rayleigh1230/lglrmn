# Source Generated with Decompyle++
# File: get_communicating_outpost_union.pyc (Python 3.11)

union_id_list = []
cooperation_record_dict = GameDataMgr().get_table(TableID.USER_NEUTRALITY_COOPERATION)
if cooperation_record_dict:
    for record in six.itervalues(cooperation_record_dict):
        if record[UserNeutralityCooperationField.USERID] != GameDataMgr().user_id:
            continue
        union_id = record[UserNeutralityCooperationField.UNION_ID]
        communicating_info = parse_cfg_str_to_dict_of_list(record[UserNeutralityCooperationField.COMMUNICATING_INFO], is_num = True, is_force_list = True)
        if communicating_info and union_id not in union_id_list:
            union_id_list.append(union_id)
        return union_id_list
