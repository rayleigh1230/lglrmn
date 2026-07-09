# Source Generated with Decompyle++
# File: get_respack_refine_num.pyc (Python 3.11)

cur_respack_num = 0
last_get_time = 0
respack_table = GameDataMgr().get_table(TableID.USER_RESPACK)
for _, respack_record in six.viewitems(respack_table):
    if not respack_record[UserRespackField.UNPACKING]:
        cur_respack_num = cur_respack_num + 1
        last_get_time = max(respack_record[UserRespackField.GET_TIME], last_get_time)
    return (cur_respack_num, last_get_time)
