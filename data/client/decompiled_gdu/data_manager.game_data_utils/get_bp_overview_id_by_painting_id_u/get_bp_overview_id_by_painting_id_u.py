# Source Generated with Decompyle++
# File: get_bp_overview_id_by_painting_id_u.pyc (Python 3.11)

bp_overview_ids = None
painting_tb = GameDataMgr().get_table(TableID.USER_PAINTING)
for id_u, record in six.iteritems(painting_tb):
    if record[UserPaintingField.USERID] != GameDataMgr().user_id:
        continue
    if id_u == painting_id_u:
        bp_overview_ids = parse_cfg_str_to_list(record[UserPaintingField.APPLY_BP_OVERVIEW_ID_US], True)
    return bp_overview_ids
