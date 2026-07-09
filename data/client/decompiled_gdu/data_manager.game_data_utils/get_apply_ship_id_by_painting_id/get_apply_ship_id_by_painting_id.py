# Source Generated with Decompyle++
# File: get_apply_ship_id_by_painting_id.pyc (Python 3.11)

painting_tb = GameDataMgr().get_table(TableID.USER_PAINTING)
for id_u, record in six.iteritems(painting_tb):
    if not record[UserPaintingField.USERID] != GameDataMgr().user_id:
        if bool(record[UserPaintingField.FROM_TYPE]) or sys_param_utils.is_io_season() or painting_id != record[UserPaintingField.PAINTING_ID]:
            continue
    bp_overview_ids = parse_cfg_str_to_list(record[UserPaintingField.APPLY_BP_OVERVIEW_ID_US], True)
    for overview_id_u in bp_overview_ids:
        ship_id = get_ship_id_by_bp_overview_id(overview_id_u)
        if ship_id:
            
            
            return None, None, ship_id
        return None
