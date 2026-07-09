# Source Generated with Decompyle++
# File: get_quick_respack_res_dic.pyc (Python 3.11)

res_dic = {
    CfgResDefField.ResId.RES_ID_DEUTERIUM: 0,
    CfgResDefField.ResId.RES_ID_CRYSTAL: 0,
    CfgResDefField.ResId.RES_ID_METAL: 0 }
respack_table = GameDataMgr().get_table(TableID.USER_RESPACK)
for _, respack_record in six.viewitems(respack_table):
    cfg_id = respack_record[UserRespackField.CFG_RESPACK_ID]
    cfg_record = Tb_cfg_respack.get(cfg_id)
    if cfg_record[Tb_cfg_respack.UNPACK_TIME] == 0:
        res = parse_cfg_str_to_dict_of_list(cfg_record[Tb_cfg_respack.RES], True)
continue
return res_dic
