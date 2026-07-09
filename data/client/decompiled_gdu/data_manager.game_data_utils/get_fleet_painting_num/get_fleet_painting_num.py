# Source Generated with Decompyle++
# File: get_fleet_painting_num.pyc (Python 3.11)

UserPaintingField = UserPaintingField
import common.config.table_definition
painting_data_utils = painting_data_utils
import data_manager
painting_id_set = []
gdm = GameDataMgr()
painting_table = gdm.get_table(TableID.USER_PAINTING)
default_painting = get_user_identity_ability_painting()
total_num = 0
unread_num = 0
unread_ids = []
aggregate_id_set = []
for _id, record in six.viewitems(painting_table):
    is_unread = int(record[UserPaintingField.UNREAD])
    painting_id = int(record[UserPaintingField.PAINTING_ID])
    if painting_id != 100 and painting_id != default_painting and painting_id not in painting_id_set:
        aggregate_id = painting_data_utils.get_painting_aggregate_id(painting_id)
        if aggregate_id:
            if aggregate_id not in aggregate_id_set:
                aggregate_id_set.append(aggregate_id)
                total_num += 1
                painting_id_set.append(painting_id)
            else:
                total_num += 1
                painting_id_set.append(painting_id)
    if is_unread == 1:
        if not sys_param_utils.is_io_season() or record[UserPaintingField.FROM_TYPE] == 0:
            unread_num += 1
            unread_ids.append(_id)
    return (total_num, unread_num, unread_ids)
