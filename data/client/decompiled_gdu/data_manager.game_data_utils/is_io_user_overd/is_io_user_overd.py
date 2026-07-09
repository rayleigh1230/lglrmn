# Source Generated with Decompyle++
# File: is_io_user_overd.pyc (Python 3.11)

UserIoDataField = UserIoDataField
import common.config.table_definition
io_data = GameDataMgr().get_record(TableID.USER_IO_DATA, GameDataMgr().user_id)
over_user_id_list = parse_cfg_str_to_list(io_data[UserIoDataField.OVER_USERID_LIST], is_num = True)
return user_id in over_user_id_list
