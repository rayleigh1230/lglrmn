# Source Generated with Decompyle++
# File: check_command_is_unlock.pyc (Python 3.11)

state = False
stuff_record = GameDataMgr().get_record(TableID.USER_STUFF, GameDataMgr().user_id)
if stuff_record:
    user_command = stuff_record[UserStuffField.UNLOCK_USER_COMMAND]
    if user_command and command_id:
        data = parse_cfg_str_to_list(user_command, True)
        state = command_id in data
return state
