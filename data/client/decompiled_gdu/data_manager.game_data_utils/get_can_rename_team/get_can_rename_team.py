# Source Generated with Decompyle++
# File: get_can_rename_team.pyc (Python 3.11)

user_stuff = GameDataMgr().get_record(TableID.USER_STUFF, GameDataMgr().user_id)
if user_stuff:
    ban_end_time = user_stuff[UserStuffField.TEAM_RENAME_BAN_TIME]
    if ban_end_time or time_utils.get_server_time() < ban_end_time:
        return (False, language.BAN_RENAME_TIPS)
    return None
return None
