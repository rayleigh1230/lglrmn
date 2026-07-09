# Source Generated with Decompyle++
# File: get_painting_id_u_by_ship_id.pyc (Python 3.11)

if not strategy:
    pass
strategy = BaseStratege()
painting_id_u = None
if user_id:
    user_id = GameDataMgr().user_id
bp_overview_id = get_bp_overview_id_by_ship_id(ship_id, is_force_by_main_id, strategy = strategy)
if bp_overview_id:
    painting_tb = GameDataMgr().get_table(TableID.USER_PAINTING)
    for id_u, record in six.iteritems(painting_tb):
        if record[UserPaintingField.USERID] != user_id:
            continue
        if bp_overview_id in parse_cfg_str_to_list(record[UserPaintingField.APPLY_BP_OVERVIEW_ID_US], True):
            painting_id_u = id_u
        return painting_id_u
