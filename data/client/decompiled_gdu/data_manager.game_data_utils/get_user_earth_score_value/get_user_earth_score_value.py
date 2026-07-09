# Source Generated with Decompyle++
# File: get_user_earth_score_value.pyc (Python 3.11)

user_record = GameDataMgr().get_record(TableID.USER, GameDataMgr().user_id)
if user_record:
    return user_record[UserField.ECOLOGY_SCORE]
