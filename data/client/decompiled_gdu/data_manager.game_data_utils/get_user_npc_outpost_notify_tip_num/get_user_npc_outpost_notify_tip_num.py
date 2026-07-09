# Source Generated with Decompyle++
# File: get_user_npc_outpost_notify_tip_num.pyc (Python 3.11)

num = 0
notify_table = GameDataMgr().get_table(TableID.USER_OUTPOST_NOTIFY)
cur_time = time_utils.get_server_time()
for _, notify_record in six.iteritems(notify_table):
    if notify_record[UserOutpostNotifyField.OUTPOST_ID] not in outpost_ids:
        continue
    if notify_record[UserOutpostNotifyField.EXPIRE_TIME] <= cur_time:
        continue
    if notify_record[UserOutpostNotifyField.READ] == 0 and notify_record[UserOutpostNotifyField.USERID] == GameDataMgr().user_id:
        num += 1
    return num
