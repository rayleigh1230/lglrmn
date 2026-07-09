# Source Generated with Decompyle++
# File: check_is_cbg_player_login.pyc (Python 3.11)

UserCbgField = UserCbgField
import common.config.table_definition
cbg_record = GameDataMgr().get_record(TableID.USER_CBG, GameDataMgr().user_id)
if cbg_record and cbg_record[UserCbgField.CBG_TO_WAIT] > 0:
    return True
