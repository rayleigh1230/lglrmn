# Source Generated with Decompyle++
# File: get_max_user_res.pyc (Python 3.11)

game_data_mgr = GameDataMgr()
res_record = game_data_mgr.get_record(TableID.USER_RES, game_data_mgr.user_id)
if res_record:
    r = collections.OrderedDict()
    r[CfgResDefField.ResId.RES_ID_METAL] = res_record[UserResField.METAL_MAX]
    r[CfgResDefField.ResId.RES_ID_CRYSTAL] = res_record[UserResField.CRYSTAL_MAX]
    r[CfgResDefField.ResId.RES_ID_DEUTERIUM] = res_record[UserResField.DEUTERIUM_MAX]
    r[CfgResDefField.ResId.RES_ID_COIN] = res_record[UserResField.COIN_MAX]
r[CfgResDefField.ResId.RES_ID_SPEEDUPS] = res_record[UserResField.SPEEDUP_MAX]
r[CfgResDefField.ResId.RES_ID_SPECIAL_MINE] = res_record[UserResField.SPECIAL_MINE_MAX]
return r
return { }
