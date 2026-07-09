# Source Generated with Decompyle++
# File: get_possess_num_by_painting_id.pyc (Python 3.11)

UserPaintingField = UserPaintingField
import common.config.table_definition
num = 0
painting_table = GameDataMgr().get_table(TableID.USER_PAINTING)
for _, record in six.viewitems(painting_table):
    pnt_id = int(record[UserPaintingField.PAINTING_ID])
    time_limit = int(record[UserPaintingField.TIME_LIMIT])
    user_id = int(record[UserPaintingField.USERID])
    if pnt_id == painting_id and time_limit != 0 and user_id == GameDataMgr().user_id:
        num += 1
        continue
    if pnt_id == painting_id and time_limit == 0 and user_id == GameDataMgr().user_id:
        num = int(record[UserPaintingField.NUM])
        
        return None, num
    return num
