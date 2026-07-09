# Source Generated with Decompyle++
# File: get_user_rally_tip_num.pyc (Python 3.11)

num = 0
stuff_record = GameDataMgr().get_record(TableID.USER_STUFF_EX, GameDataMgr().user_id)
if stuff_record:
    league_unread_ids = []
    union_unread_ids = []
    union_unread = stuff_record[UserStuffExField.UNION_ASSEMBLE_UNREAD_ID]
    league_unread = stuff_record[UserStuffExField.LEAGUE_ASSEMBLE_UNREAD_ID]
    if league_unread:
        league_unread_ids = parse_cfg_str_to_list(league_unread, True)
    if union_unread:
        union_unread_ids = parse_cfg_str_to_list(union_unread, True)
    num = len(union_unread_ids) if not include_league else len(set(league_unread_ids + union_unread_ids))
return num
