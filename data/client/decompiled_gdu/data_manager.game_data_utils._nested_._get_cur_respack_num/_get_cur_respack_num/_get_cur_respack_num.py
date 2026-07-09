# Source Generated with Decompyle++
# File: _get_cur_respack_num.pyc (Python 3.11)

cur_respack_num = 0
respack_table = GameDataMgr().get_table(TableID.USER_RESPACK)
self_user_id = GameDataMgr().user_id
for record in six.itervalues(respack_table):
    if record[UserRespackField.USERID] == self_user_id:
        cur_respack_num += 1
    return cur_respack_num
