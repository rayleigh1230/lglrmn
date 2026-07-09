# Source Generated with Decompyle++
# File: get_unread_painting_list.pyc (Python 3.11)

UserPaintingField = UserPaintingField
import common.config.table_definition
unread_ids = []
painting_table = GameDataMgr().get_table(TableID.USER_PAINTING)
for _, record in six.viewitems(painting_table):
    is_unread = int(record[UserPaintingField.UNREAD])
    if is_unread == 1:
        unread_ids.append(record[UserPaintingField.ID])
    return unread_ids
