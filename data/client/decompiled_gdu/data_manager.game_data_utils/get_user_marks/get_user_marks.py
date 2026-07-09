# Source Generated with Decompyle++
# File: get_user_marks.pyc (Python 3.11)

dic = { }
mark_table = GameDataMgr().get_table(TableID.WORLD_MARK)
for _id, record in six.iteritems(mark_table):
    if record[WorldMarkField.USERID] == user_id:
        dic[_id] = record
    return dic
