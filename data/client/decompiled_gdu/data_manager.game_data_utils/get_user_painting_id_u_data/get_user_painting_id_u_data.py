# Source Generated with Decompyle++
# File: get_user_painting_id_u_data.pyc (Python 3.11)

painting_data_utils = painting_data_utils
import data_manager
user_painting_ids = { }
user_painting_num = { }
aggregate_painting_id = collections.defaultdict(list)
user_painting_tb = GameDataMgr().get_table(TableID.USER_PAINTING)
default_painting = get_user_identity_ability_painting()
for painting_id_u, record in six.viewitems(user_painting_tb):
    if record[UserPaintingField.USERID] != GameDataMgr().user_id:
        continue
    painting_id_u = record[UserPaintingField.ID]
    painting_id = record[UserPaintingField.PAINTING_ID]
    if painting_data_utils.is_aggregate_painting(painting_id):
        aggregate_id = painting_data_utils.get_painting_aggregate_id(painting_id)
        aggregate_painting_id[aggregate_id].append(painting_id_u)
        continue
    num = record[UserPaintingField.NUM]
    if painting_id != 100 and painting_id != default_painting:
        user_painting_ids[painting_id_u] = painting_id
        user_painting_num[painting_id_u] = num
    
    def sort_func(x, y):
        painting_id1 = get_painting_id_by_painting_id_u(x)
        painting_id2 = get_painting_id_by_painting_id_u(y)
        return cmp(Tb_cfg_painting_set.get(painting_id1)[Tb_cfg_painting_set.VERSION], Tb_cfg_painting_set.get(painting_id2)[Tb_cfg_painting_set.VERSION])

    for aggregate_id, idu_list in six.iteritems(aggregate_painting_id):
        idu_list.sort(key = cmp_to_key(sort_func))
        minn_idu = idu_list[0]
        if minn_idu != 100 and minn_idu != default_painting:
            record = user_painting_tb.get(minn_idu, { })
            painting_id = record[UserPaintingField.PAINTING_ID]
            num = record[UserPaintingField.NUM]
            user_painting_ids[minn_idu] = painting_id
            user_painting_num[minn_idu] = num
        return (user_painting_ids, user_painting_num, aggregate_painting_id)
