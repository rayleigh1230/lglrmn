# Source Generated with Decompyle++
# File: get_user_painting_data.pyc (Python 3.11)

user_painting_ids = { }
user_painting_num = { }
user_painting_tb = GameDataMgr().get_table(TableID.USER_PAINTING)
default_painting = get_user_identity_ability_painting()
for painting_id_u, record in six.viewitems(user_painting_tb):
    if record[UserPaintingField.USERID] != GameDataMgr().user_id:
        continue
    painting_id_u = record[UserPaintingField.ID]
    painting_id = record[UserPaintingField.PAINTING_ID]
    num = record[UserPaintingField.NUM]
    if painting_id != 100 and painting_id != default_painting:
        user_painting_ids[painting_id] = user_painting_ids.get(painting_id, []) + [
            painting_id_u]
        user_painting_num[painting_id] = user_painting_num.get(painting_id, 0) + num
    return (user_painting_ids, user_painting_num)
