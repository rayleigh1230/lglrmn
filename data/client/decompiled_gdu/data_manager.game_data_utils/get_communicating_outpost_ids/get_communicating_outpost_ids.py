# Source Generated with Decompyle++
# File: get_communicating_outpost_ids.pyc (Python 3.11)

outpost_ids = []
cooperation_record_dict = GameDataMgr().get_table(TableID.USER_NEUTRALITY_COOPERATION)
if cooperation_record_dict:
    for record in six.itervalues(cooperation_record_dict):
        if record[UserNeutralityCooperationField.USERID] != GameDataMgr().user_id:
            continue
        communicating_info = parse_cfg_str_to_dict_of_list(record[UserNeutralityCooperationField.COMMUNICATING_INFO], is_num = True, is_force_list = True)
        for id in communicating_info:
            if id not in outpost_ids:
                outpost_ids.append(id)
            return outpost_ids
