# Source Generated with Decompyle++
# File: check_main_base_destroyed.pyc (Python 3.11)

self_user_id = GameDataMgr().user_id
record = GameDataMgr().get_record(TableID.USER_FLY_REBORN, self_user_id)
if record:
    is_read = record[UserFlyRebornField.IS_READ]
    if is_read:
        return False
    reborn_type = None[UserFlyRebornField.REBORN_TYPE]
    tr = reborn_type in (UserFlyRebornField.RebornMsgType.REBORN_MSG_TYPE_BASE_FALL, UserFlyRebornField.RebornMsgType.REBORN_MSG_TYPE_TEAM_FALL, UserFlyRebornField.RebornMsgType.REBORN_MSG_TYPE_EMERGENCY_EVACUATION, UserFlyRebornField.RebornMsgType.REBORN_MSG_TYPE_NO_OWNERSHIP, UserFlyRebornField.RebornMsgType.REBORN_MSG_TYPE_STELLAR_STORM)
    return tr
