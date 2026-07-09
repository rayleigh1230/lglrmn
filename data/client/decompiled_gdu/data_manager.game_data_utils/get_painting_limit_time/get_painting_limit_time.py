# Source Generated with Decompyle++
# File: get_painting_limit_time.pyc (Python 3.11)

end_time = 0
painting_record = GameDataMgr().get_record(TableID.USER_PAINTING, painting_id_u)
if painting_record:
    end_time = painting_record[UserPaintingField.TIME_LIMIT]
return end_time
