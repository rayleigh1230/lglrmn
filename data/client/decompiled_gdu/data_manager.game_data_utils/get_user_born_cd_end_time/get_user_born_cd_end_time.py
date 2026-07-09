# Source Generated with Decompyle++
# File: get_user_born_cd_end_time.pyc (Python 3.11)

stuff_record = GameDataMgr().get_record(TableID.USER_STUFF, GameDataMgr().user_id)
end_time = stuff_record[UserStuffField.REBUILD_CD_END_TIME]
return end_time
