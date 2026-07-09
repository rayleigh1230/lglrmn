# Source Generated with Decompyle++
# File: get_io_explore_estimate_score.pyc (Python 3.11)

record = GameDataMgr().get_record(TableID.USER_IO_DATA, GameDataMgr().user_id)
score = record.get(UserIoDataField.IO_SCORE, 0)
return score
