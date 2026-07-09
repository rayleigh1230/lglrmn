# Source Generated with Decompyle++
# File: set_estimate_user_res.pyc (Python 3.11)

game_data_mgr = GameDataMgr()
res_update_record = { }
if CfgResDefField.ResId.RES_ID_METAL in res_dict:
    res_update_record[RES_METAL_CUR] = res_dict[CfgResDefField.ResId.RES_ID_METAL]
if CfgResDefField.ResId.RES_ID_CRYSTAL in res_dict:
    res_update_record[RES_CRYSTAL_CUR] = res_dict[CfgResDefField.ResId.RES_ID_CRYSTAL]
if CfgResDefField.ResId.RES_ID_DEUTERIUM in res_dict:
    res_update_record[RES_DEUTERIUM_CUR] = res_dict[CfgResDefField.ResId.RES_ID_DEUTERIUM]
if CfgResDefField.ResId.RES_ID_COIN in res_dict:
    res_update_record[RES_COIN_CUR] = res_dict[CfgResDefField.ResId.RES_ID_COIN]
if CfgResDefField.ResId.RES_ID_SPEEDUPS in res_dict:
    res_update_record[RES_SPEEDUP_CUR] = round(res_dict[CfgResDefField.ResId.RES_ID_SPEEDUPS], 1)
if CfgResDefField.ResId.RES_ID_SPECIAL_MINE in res_dict:
    res_update_record[RES_SPECIAL_MINE_CUR] = res_dict[CfgResDefField.ResId.RES_ID_SPECIAL_MINE]
notify = game_data_mgr.update_record(TableID.USER_RES, game_data_mgr.user_id, res_update_record, True)
if notify:
    (_, update_record, old_record) = notify
    GameEventManager().notify('client_user_res_record_update', update_record, old_record)
    return None
