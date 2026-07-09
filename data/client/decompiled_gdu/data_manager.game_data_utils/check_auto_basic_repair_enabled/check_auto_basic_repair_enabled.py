# Source Generated with Decompyle++
# File: check_auto_basic_repair_enabled.pyc (Python 3.11)

stuff_record = GameDataMgr().get_record(TableID.USER_STUFF, GameDataMgr().user_id)
if stuff_record:
    user_commands = parse_cfg_str_to_list(stuff_record[UserStuffField.UNLOCK_USER_COMMAND], is_num = True)
    return UserStuffField.UserCommand.USER_COMMAND_UNLOCK_SHIP_REPAIR in user_commands
