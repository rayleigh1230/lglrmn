# Source Generated with Decompyle++
# File: is_show_io_hall_channel.pyc (Python 3.11)

contract_record = GameDataMgr().get_record(TableID.USER_IO_CONTRACT, GameDataMgr().user_id)
return bool(contract_record)
