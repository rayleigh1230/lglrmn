# Source Generated with Decompyle++
# File: get_add_user_res.pyc (Python 3.11)

game_data_mgr = GameDataMgr()
res_record = game_data_mgr.get_record(TableID.USER_RES, game_data_mgr.user_id)
if res_record:
    r = collections.OrderedDict()
    r[CfgResDefField.ResId.RES_ID_METAL] = res_record[UserResField.METAL_ADD]
    r[CfgResDefField.ResId.RES_ID_CRYSTAL] = res_record[UserResField.CRYSTAL_ADD]
    r[CfgResDefField.ResId.RES_ID_DEUTERIUM] = res_record[UserResField.DEUTERIUM_ADD]
    r[CfgResDefField.ResId.RES_ID_COIN] = res_record[UserResField.COIN_ADD]
r[CfgResDefField.ResId.RES_ID_SPEEDUPS] = get_speedup_add_speed()
r[CfgResDefField.ResId.RES_ID_SPECIAL_MINE] = 0
return r
return { }
