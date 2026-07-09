# Source Generated with Decompyle++
# File: get_io_galaxy_evaluate_left_time.pyc (Python 3.11)

record = GameDataMgr().get_record(TableID.USER_IO_DATA, GameDataMgr().user_id)
if not record:
    return 0
evaluate_time = None[UserIoDataField.ENTER_IO_TIME] + IO_ENTER_SETTLE_TIME
left_time = evaluate_time - time_utils.get_server_time()
return max(0, left_time)
