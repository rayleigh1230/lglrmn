# Source Generated with Decompyle++
# File: get_user_research_point_reserve_value.pyc (Python 3.11)

user_stuff_record = GameDataMgr().get_record(TableID.USER_STUFF, GameDataMgr().user_id)
if user_stuff_record:
    return user_stuff_record[UserStuffField.RESEARCH_POINT_RESERVE]
