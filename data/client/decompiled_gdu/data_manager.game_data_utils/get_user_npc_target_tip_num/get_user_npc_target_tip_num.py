# Source Generated with Decompyle++
# File: get_user_npc_target_tip_num.pyc (Python 3.11)

num = 0
total_ids = []
dispatch_record = GameDataMgr().get_record(TableID.USER_NPC_DISPATCH, GameDataMgr().user_id)
if not dispatch_record:
    return 0
if None[UserNpcDispatchField.COMMAND_DISPATCH_RECORD]:
    ret = parse_cfg_str_to_list_of_list(dispatch_record[UserNpcDispatchField.COMMAND_DISPATCH_RECORD], True)
    for _ret in ret:
        if len(_ret) > 1 and _ret[0] in outpost_ids:
            total_ids.extend(_ret[1:])
        read_record = parse_cfg_str_to_list(dispatch_record[UserNpcDispatchField.READ_DISPATCH_RECORD], True)
        for x in total_ids:
            if x not in read_record:
                num += 1
            return num
