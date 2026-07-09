# Source Generated with Decompyle++
# File: get_estimate_user_res.pyc (Python 3.11)

game_data_mgr = GameDataMgr()
res_record = game_data_mgr.get_record(TableID.USER_RES, game_data_mgr.user_id)
if res_record:
    pass
return {
    CfgResDefField.ResId.RES_ID_SPECIAL_MINE: int(res_record.get(RES_SPECIAL_MINE_CUR, res_record[UserResField.SPECIAL_MINE_CUR])),
    CfgResDefField.ResId.RES_ID_SPEEDUPS: int(res_record.get(RES_SPEEDUP_CUR, res_record[UserResField.SPEEDUP_CUR])),
    CfgResDefField.ResId.RES_ID_COIN: int(res_record.get(RES_COIN_CUR, res_record[UserResField.COIN_CUR])),
    CfgResDefField.ResId.RES_ID_DEUTERIUM: int(res_record.get(RES_DEUTERIUM_CUR, res_record[UserResField.DEUTERIUM_CUR])),
    CfgResDefField.ResId.RES_ID_CRYSTAL: int(res_record.get(RES_CRYSTAL_CUR, res_record[UserResField.CRYSTAL_CUR])),
    CfgResDefField.ResId.RES_ID_METAL: int(res_record.get(RES_METAL_CUR, res_record[UserResField.METAL_CUR])) }
return { }
