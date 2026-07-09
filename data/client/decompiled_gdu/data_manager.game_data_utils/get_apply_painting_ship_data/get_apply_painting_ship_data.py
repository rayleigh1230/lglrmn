# Source Generated with Decompyle++
# File: get_apply_painting_ship_data.pyc (Python 3.11)

apply_painting_ship_dict = { }
user_painting_tb = GameDataMgr().get_table(TableID.USER_PAINTING)
default_painting = get_user_identity_ability_painting()
for painting_id_u, record in six.viewitems(user_painting_tb):
    if record[UserPaintingField.USERID] != GameDataMgr().user_id:
        continue
    painting_id = record[UserPaintingField.PAINTING_ID]
    apply_bp_overview_id = parse_cfg_str_to_list(record[UserPaintingField.APPLY_BP_OVERVIEW_ID_US], True)
    if painting_id != 100 and len(apply_bp_overview_id) != 0 and painting_id != default_painting:
        apply_painting_ship_dict[painting_id_u] = apply_bp_overview_id
    return apply_painting_ship_dict
